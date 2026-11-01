package com.civicfix.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * CivicFix AI — File Storage Abstraction
 * 
 * Supports local filesystem storage for development/air-gapped deployments,
 * with clean extensibility for AWS S3 / Azure Blob Storage providers.
 */
public interface StorageService {

    /**
     * Stores a validated multipart file into the designated sub-directory.
     * Generates a sanitized, collision-resistant unique filename.
     * 
     * @param file the uploaded multipart file
     * @param subDirectory target folder (e.g. "evidence/complaints")
     * @return relative web-accessible resource path (e.g. "/api/complaints/evidence/files/evidence-abc.jpg")
     * @throws IOException on physical I/O or storage failure
     */
    String storeFile(MultipartFile file, String subDirectory) throws IOException;

    /**
     * Loads a stored file as a Spring Resource for controlled binary streaming.
     * Prevents path-traversal attacks.
     * 
     * @param filename sanitized filename
     * @param subDirectory folder where the file resides
     * @return readable Resource
     * @throws IOException if the file does not exist or cannot be read
     */
    Resource loadFileAsResource(String filename, String subDirectory) throws IOException;

    /**
     * Deletes a stored file if present.
     * 
     * @param filename sanitized filename
     * @param subDirectory target folder
     */
    void deleteFile(String filename, String subDirectory);
}
