package com.civicfix.storage;

import com.civicfix.common.exception.BadRequestException;
import com.civicfix.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LocalStorageServiceTest {

    @TempDir
    Path tempUploadDir;

    private LocalStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalStorageService(tempUploadDir.toString());
    }

    @Test
    @DisplayName("Valid JPEG image is safely stored, sanitized, and returns relative URL")
    void storeFile_validJpeg_returnsRelativeUrl() throws IOException {
        byte[] jpegBytes = TestImageHelper.createValidJpeg(20, 20);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "road_repair.jpg",
                "image/jpeg",
                jpegBytes
        );

        String url = storageService.storeFile(file, "test-complaints");
        assertNotNull(url);
        assertTrue(url.startsWith("/api/complaints/evidence/files/evidence-"));
        assertTrue(url.endsWith(".jpg"));
        assertFalse(url.contains(".."));

        // Verify stored file is on disk
        String filename = url.substring(url.lastIndexOf('/') + 1);
        Resource res = storageService.loadFileAsResource(filename, "test-complaints");
        assertTrue(res.exists());
        assertTrue(res.isReadable());
    }

    @Test
    @DisplayName("Valid PNG image is safely stored and re-encoded")
    void storeFile_validPng_returnsRelativeUrl() throws IOException {
        byte[] pngBytes = TestImageHelper.createValidPng(15, 15);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "patch_proof.png",
                "image/png",
                pngBytes
        );

        String url = storageService.storeFile(file, "test-complaints");
        assertNotNull(url);
        assertTrue(url.endsWith(".png"));
    }

    @Test
    @DisplayName("Valid WebP image is accepted and stored based on verified RIFF....WEBP magic bytes")
    void storeFile_validWebp_returnsRelativeUrl() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "camera_snapshot.webp",
                "image/webp",
                TestImageHelper.TINY_WEBP
        );

        String url = storageService.storeFile(file, "test-complaints");
        assertNotNull(url);
        assertTrue(url.endsWith(".webp"));
    }

    @Test
    @DisplayName("Text file renamed as .jpg is rejected with 400 Bad Request (magic bytes failure)")
    void storeFile_textRenamedToJpg_throwsBadRequest() {
        MockMultipartFile fakeFile = new MockMultipartFile(
                "file",
                "malicious_script.jpg",
                "image/jpeg",
                "echo 'Simulated payload attacking server';".getBytes()
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(fakeFile, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("File content does not match declared JPEG format"),
                "Error must indicate JPEG format mismatch");
    }

    @Test
    @DisplayName("Mismatched declared type and file extension is rejected with 400 Bad Request")
    void storeFile_mismatchedTypeAndExtension_throwsBadRequest() {
        byte[] validPng = TestImageHelper.createValidPng(5, 5);
        // Extension says .jpg, but Content-Type says image/png
        MockMultipartFile mismatchedFile = new MockMultipartFile(
                "file",
                "photo.jpg",
                "image/png",
                validPng
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(mismatchedFile, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("disagrees with file extension"),
                "Error message must specify type and extension disagreement");
    }

    @Test
    @DisplayName("PNG bytes disguised with .jpg extension and image/jpeg header is rejected by magic bytes check")
    void storeFile_pngBytesWithJpegExtension_throwsBadRequest() {
        byte[] validPng = TestImageHelper.createValidPng(5, 5);
        MockMultipartFile disguisedFile = new MockMultipartFile(
                "file",
                "disguised.jpg",
                "image/jpeg",
                validPng
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(disguisedFile, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("File content does not match declared JPEG format"));
    }

    @Test
    @DisplayName("Stored JPEG has all EXIF/GPS metadata stripped by ImageIO decode and re-encode")
    void storeFile_jpegWithExif_storedCopyHasNoExif() throws IOException {
        byte[] jpegWithExif = TestImageHelper.createJpegWithExif();

        // Verify the original source payload has the APP1 EXIF marker (0xFF, 0xE1)
        boolean inputHasExif = false;
        for (int i = 0; i < jpegWithExif.length - 1; i++) {
            if ((jpegWithExif[i] & 0xFF) == 0xFF && (jpegWithExif[i + 1] & 0xFF) == 0xE1) {
                inputHasExif = true;
                break;
            }
        }
        assertTrue(inputHasExif, "Test fixture must contain APP1 EXIF segment prior to storage");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "photo_with_gps.jpg",
                "image/jpeg",
                jpegWithExif
        );

        String url = storageService.storeFile(file, "test-complaints");
        String filename = url.substring(url.lastIndexOf('/') + 1);

        Path storedPath = tempUploadDir.resolve("test-complaints").resolve(filename);
        assertTrue(Files.exists(storedPath));

        byte[] storedBytes = Files.readAllBytes(storedPath);
        // Verify stored JPEG has NO APP1 EXIF marker (0xFF, 0xE1)
        boolean storedHasExif = false;
        for (int i = 0; i < storedBytes.length - 1; i++) {
            if ((storedBytes[i] & 0xFF) == 0xFF && (storedBytes[i + 1] & 0xFF) == 0xE1) {
                storedHasExif = true;
                break;
            }
        }
        assertFalse(storedHasExif, "Stored JPEG must have all EXIF/GPS metadata completely stripped");
    }

    @Test
    @DisplayName("Decompression bomb exceeding 40 megapixels is rejected with BadRequestException")
    void storeFile_decompressionBomb_throwsBadRequest() {
        byte[] bomb = TestImageHelper.createPngDecompressionBomb();
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "bomb.png",
                "image/png",
                bomb
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(file, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("decompression bomb protection"),
                "Must reject image exceeding 40 megapixels");
    }

    @Test
    @DisplayName("Empty file is rejected with BadRequestException")
    void storeFile_emptyFile_throwsBadRequest() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.jpg",
                "image/jpeg",
                new byte[0]
        );

        assertThrows(BadRequestException.class, () ->
                storageService.storeFile(emptyFile, "test-complaints")
        );
    }

    @Test
    @DisplayName("File exceeding 10MB limit is rejected with BadRequestException")
    void storeFile_oversizedFile_throwsBadRequest() {
        byte[] oversizedData = new byte[11 * 1024 * 1024]; // 11MB
        MockMultipartFile largeFile = new MockMultipartFile(
                "file",
                "huge.jpg",
                "image/jpeg",
                oversizedData
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(largeFile, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("exceeds the 10MB maximum size limit"));
    }

    @Test
    @DisplayName("Disallowed MIME type (.exe, .pdf) is rejected with BadRequestException")
    void storeFile_invalidMimeType_throwsBadRequest() {
        MockMultipartFile pdfFile = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                "%PDF-1.4 fake".getBytes()
        );

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                storageService.storeFile(pdfFile, "test-complaints")
        );
        assertTrue(ex.getMessage().contains("Only JPG, PNG, and WebP images are permitted"));
    }

    @Test
    @DisplayName("Path traversal attack in filename is blocked with BadRequestException")
    void storeFile_pathTraversalFilename_throwsBadRequest() {
        byte[] validJpeg = TestImageHelper.createValidJpeg(2, 2);
        MockMultipartFile traversalFile = new MockMultipartFile(
                "file",
                "../../etc/passwd.jpg",
                "image/jpeg",
                validJpeg
        );

        assertThrows(BadRequestException.class, () ->
                storageService.storeFile(traversalFile, "test-complaints")
        );
    }

    @Test
    @DisplayName("Path traversal attack in subDirectory is blocked with BadRequestException")
    void storeFile_pathTraversalSubdirectory_throwsBadRequest() {
        byte[] validJpeg = TestImageHelper.createValidJpeg(2, 2);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valid.jpg",
                "image/jpeg",
                validJpeg
        );

        assertThrows(BadRequestException.class, () ->
                storageService.storeFile(file, "../../forbidden-folder")
        );
    }

    @Test
    @DisplayName("Stored file can be retrieved as readable Resource")
    void loadFileAsResource_existingFile_returnsReadableResource() throws IOException {
        byte[] validJpeg = TestImageHelper.createValidJpeg(5, 5);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valid.jpg",
                "image/jpeg",
                validJpeg
        );

        String url = storageService.storeFile(file, "complaints");
        String filename = url.substring(url.lastIndexOf('/') + 1);

        Resource res = storageService.loadFileAsResource(filename, "complaints");
        assertNotNull(res);
        assertTrue(res.exists());
        assertTrue(res.isReadable());
    }

    @Test
    @DisplayName("Non-existent file load throws ResourceNotFoundException")
    void loadFileAsResource_nonExistent_throwsResourceNotFound() {
        assertThrows(ResourceNotFoundException.class, () ->
                storageService.loadFileAsResource("non_existent_file.jpg", "complaints")
        );
    }
}
