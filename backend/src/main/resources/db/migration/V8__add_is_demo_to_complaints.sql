-- CivicFix AI — V8 Add is_demo Flag to Complaints
-- Enables identification and controlled management of repeatable demo datasets without affecting production records

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_complaints_is_demo
    ON complaints (is_demo);

