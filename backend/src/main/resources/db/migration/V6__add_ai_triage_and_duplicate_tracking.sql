-- Phase 4: Stage 1 — Add AI triage evaluation metadata and duplicate tracking
-- Safe, forward-only migration preserving all existing complaint records and versioning

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS ai_detected_category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ai_recommended_priority VARCHAR(20),
    ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS ai_hazard_score VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
    ADD COLUMN IF NOT EXISTS ai_adjudication_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    ADD COLUMN IF NOT EXISTS ai_triaged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS duplicate_of_id UUID REFERENCES complaints(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_duplicate_of 
    ON complaints (duplicate_of_id) 
    WHERE duplicate_of_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_complaints_ai_adjudication 
    ON complaints (ai_adjudication_status);
