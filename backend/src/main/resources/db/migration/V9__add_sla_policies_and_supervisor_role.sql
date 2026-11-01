-- CivicFix AI — V9 SLA Tracking Policies and Supervisor Role
-- Adds SLA deadline and escalation tracking columns to complaints,
-- seeds SLA policy matrix across CivicLexicon categories and priorities,
-- and registers the SUPERVISOR platform role.

-- 1. Add SLA and Escalation tracking columns to complaints
ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_at ON complaints(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_complaints_escalated_at ON complaints(escalated_at);

-- 2. Create SLA Policies Matrix Table
CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    hours INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sla_policy_category_priority UNIQUE (category, priority)
);

CREATE INDEX IF NOT EXISTS idx_sla_policies_lookup ON sla_policies(category, priority);

-- 3. Seed Default SLA Policies for all CivicLexicon Categories & Priorities
-- Categories: ROADS, WATER_SEWERAGE, STREET_LIGHT, GARBAGE, DRAINAGE, PUBLIC_TRANSPORT, PARKS
INSERT INTO sla_policies (category, priority, hours) VALUES
    -- ROADS
    ('ROADS', 'CRITICAL', 12),
    ('ROADS', 'HIGH', 24),
    ('ROADS', 'MEDIUM', 48),
    ('ROADS', 'LOW', 96),

    -- WATER_SEWERAGE
    ('WATER_SEWERAGE', 'CRITICAL', 6),
    ('WATER_SEWERAGE', 'HIGH', 18),
    ('WATER_SEWERAGE', 'MEDIUM', 36),
    ('WATER_SEWERAGE', 'LOW', 72),

    -- STREET_LIGHT
    ('STREET_LIGHT', 'CRITICAL', 12),
    ('STREET_LIGHT', 'HIGH', 24),
    ('STREET_LIGHT', 'MEDIUM', 48),
    ('STREET_LIGHT', 'LOW', 96),

    -- GARBAGE
    ('GARBAGE', 'CRITICAL', 12),
    ('GARBAGE', 'HIGH', 24),
    ('GARBAGE', 'MEDIUM', 48),
    ('GARBAGE', 'LOW', 72),

    -- DRAINAGE
    ('DRAINAGE', 'CRITICAL', 6),
    ('DRAINAGE', 'HIGH', 18),
    ('DRAINAGE', 'MEDIUM', 36),
    ('DRAINAGE', 'LOW', 72),

    -- PUBLIC_TRANSPORT
    ('PUBLIC_TRANSPORT', 'CRITICAL', 12),
    ('PUBLIC_TRANSPORT', 'HIGH', 24),
    ('PUBLIC_TRANSPORT', 'MEDIUM', 48),
    ('PUBLIC_TRANSPORT', 'LOW', 96),

    -- PARKS
    ('PARKS', 'CRITICAL', 12),
    ('PARKS', 'HIGH', 24),
    ('PARKS', 'MEDIUM', 48),
    ('PARKS', 'LOW', 96),

    -- Global fallback policy for unmatched categories
    ('DEFAULT', 'CRITICAL', 12),
    ('DEFAULT', 'HIGH', 24),
    ('DEFAULT', 'MEDIUM', 48),
    ('DEFAULT', 'LOW', 96)
ON CONFLICT (category, priority) DO NOTHING;

-- 4. Register SUPERVISOR in roles table
INSERT INTO roles (name) VALUES ('SUPERVISOR')
ON CONFLICT (name) DO NOTHING;

