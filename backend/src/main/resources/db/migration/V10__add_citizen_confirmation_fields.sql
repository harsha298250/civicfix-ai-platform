-- V10: Add Citizen Resolution Confirmation and Reopen Tracking Fields
-- Forward-only migration adding closure confirmation timestamps, confirmation source, and reopen counters.

ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS pending_confirmation_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS confirmation_source VARCHAR(20),
    ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0;

-- Index to optimize scheduler queries selecting complaints awaiting citizen confirmation
CREATE INDEX IF NOT EXISTS idx_complaints_pending_confirmation
    ON complaints (status, pending_confirmation_at)
    WHERE status = 'PENDING_CITIZEN_CONFIRMATION';

