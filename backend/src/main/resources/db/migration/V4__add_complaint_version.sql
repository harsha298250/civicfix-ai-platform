-- Flyway Migration V4: Add optimistic locking version column to complaints table
-- Ensures concurrency safety and prevents blind overwrites during concurrent updates.

ALTER TABLE complaints ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
