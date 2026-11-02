-- V12: Add vision triage columns, citizen consent gate, and priority elevation tracking
-- Safe, forward-only migration preserving all existing complaint records and versioning

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS vision_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS vision_category VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vision_severity INTEGER,
    ADD COLUMN IF NOT EXISTS vision_confidence NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS vision_reason VARCHAR(300),
    ADD COLUMN IF NOT EXISTS vision_model VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vision_status VARCHAR(30) NOT NULL DEFAULT 'NOT_RUN',
    ADD COLUMN IF NOT EXISTS vision_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS disagreement BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS final_priority_source VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_complaints_vision_status
    ON complaints (vision_status);

CREATE INDEX IF NOT EXISTS idx_complaints_vision_at
    ON complaints (vision_at)
    WHERE vision_at IS NOT NULL;

