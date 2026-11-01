-- V11: Add location verification columns to resolution_evidence

ALTER TABLE resolution_evidence
    ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10, 1) NULL,
    ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC(8, 1) NULL,
    ADD COLUMN IF NOT EXISTS location_check VARCHAR(20) NOT NULL DEFAULT 'NOT_CHECKABLE',
    ADD COLUMN IF NOT EXISTS location_note TEXT NULL;

COMMENT ON COLUMN resolution_evidence.distance_meters IS 'Computed Haversine distance from complaint site to evidence capture location';
COMMENT ON COLUMN resolution_evidence.accuracy_meters IS 'Device-reported GPS accuracy radius in meters';
COMMENT ON COLUMN resolution_evidence.location_check IS 'Location validation verdict: WITHIN_RANGE, OUT_OF_RANGE, LOW_ACCURACY, NOT_PROVIDED, NOT_CHECKABLE';
COMMENT ON COLUMN resolution_evidence.location_note IS 'Worker justification note when location is out of range, low accuracy, or unprovided';

