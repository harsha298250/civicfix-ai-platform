-- Flyway Migration V5: Add spatial index on complaints latitude and longitude
-- Supports high-performance bounding box viewport queries and ward filtering for civic issue maps

CREATE INDEX IF NOT EXISTS idx_complaints_lat_lng
    ON complaints (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_ward
    ON complaints (ward)
    WHERE ward IS NOT NULL;
