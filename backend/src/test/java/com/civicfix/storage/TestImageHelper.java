package com.civicfix.storage;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Shared test fixture generator for valid and malicious image files.
 */
public final class TestImageHelper {

    // Valid minimal 33-byte WebP binary with RIFF and WEBP signatures
    public static final byte[] TINY_WEBP = new byte[] {
            'R', 'I', 'F', 'F',
            0x1A, 0x00, 0x00, 0x00, // Size - 8
            'W', 'E', 'B', 'P',
            'V', 'P', '8', 'L',     // Lossless VP8L
            0x0D, 0x00, 0x00, 0x00, // Chunk size
            0x2F, 0x00, 0x00, 0x00, 0x00, 0x07, 0x10, (byte) 0x88, (byte) 0x88, 0x08, 0x00, 0x00, 0x00
    };

    private TestImageHelper() {}

    /**
     * Generates a valid, minimal JPEG image binary with standard JFIF headers.
     */
    public static byte[] createValidJpeg(int width, int height) {
        try {
            int w = Math.max(1, width);
            int h = Math.max(1, height);
            BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setColor(new Color(33, 150, 243));
            g.fillRect(0, 0, w, h);
            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate test JPEG image", e);
        }
    }

    /**
     * Generates a valid, minimal PNG image binary.
     */
    public static byte[] createValidPng(int width, int height) {
        try {
            int w = Math.max(1, width);
            int h = Math.max(1, height);
            BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = image.createGraphics();
            g.setColor(new Color(76, 175, 80));
            g.fillRect(0, 0, w, h);
            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate test PNG image", e);
        }
    }

    /**
     * Generates a valid JPEG image containing an APP1 EXIF segment (FF E1).
     */
    public static byte[] createJpegWithExif() {
        byte[] baseJpeg = createValidJpeg(4, 4);
        byte[] exifApp1Segment = new byte[] {
                (byte) 0xFF, (byte) 0xE1, // APP1 Exif marker
                0x00, 0x18,               // Segment length: 24 bytes
                'E', 'x', 'i', 'f', 0x00, 0x00, // EXIF header identifier
                'M', 'M', 0x00, 0x2A,     // TIFF header (big-endian)
                0x00, 0x00, 0x00, 0x08,   // Offset to first IFD
                0x00, 0x01,               // 1 directory entry
                0x01, 0x0F, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00 // Mock Camera Make tag
        };

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        baos.write(baseJpeg[0]); // 0xFF
        baos.write(baseJpeg[1]); // 0xD8 (SOI)
        try {
            baos.write(exifApp1Segment);
            baos.write(baseJpeg, 2, baseJpeg.length - 2);
        } catch (IOException e) {
            throw new RuntimeException("Failed to assemble JPEG with EXIF", e);
        }
        return baos.toByteArray();
    }

    /**
     * Generates a synthetic PNG decompression bomb (claims 65536 x 65536 = 4.29 billion pixels).
     */
    public static byte[] createPngDecompressionBomb() {
        byte[] png = createValidPng(1, 1);
        // In PNG specification, IHDR chunk dimensions are at offset 16 (width) and 20 (height)
        byte[] bomb = png.clone();
        bomb[16] = 0x00;
        bomb[17] = 0x01;
        bomb[18] = 0x00;
        bomb[19] = 0x00; // Width = 65,536

        bomb[20] = 0x00;
        bomb[21] = 0x01;
        bomb[22] = 0x00;
        bomb[23] = 0x00; // Height = 65,536
        return bomb;
    }
}

