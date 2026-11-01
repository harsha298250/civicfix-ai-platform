-- CivicFix AI — V3 Add Citizen Complaint Photos Table
-- Persists citizen intake photographs associated with complaints

CREATE TABLE complaint_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    content_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaint_photos_complaint ON complaint_photos(complaint_id);
