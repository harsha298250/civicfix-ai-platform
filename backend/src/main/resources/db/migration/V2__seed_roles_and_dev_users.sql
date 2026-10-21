-- CivicFix AI — V2 Seed Roles and Development Test Personas
-- Inserts core enterprise roles and initial development seed accounts.
-- Password for dev personas: CivicSecure#2026! (BCrypt hashed with cost factor 10)

-- 1. Seed Roles
INSERT INTO roles (name) VALUES 
    ('CITIZEN'),
    ('OFFICER'),
    ('WORKER'),
    ('ADMIN')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Development Users
-- Alex Morgan (Citizen)
INSERT INTO users (id, full_name, email, phone, password_hash, account_status, department, ward, trust_score)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Alex Morgan',
    'alex.m@citizen.org',
    '+91 98401 23456',
    '$2a$10$vd5MDvWnGAYUrw8W.y2rPexBtLsSVkVVMb.hq2z037IWNJ8oID59q',
    'ACTIVE',
    'Resident Community Council',
    'Ward 08, Anna Nagar, Chennai',
    98
) ON CONFLICT (id) DO NOTHING;

-- Elena Vance (Municipal Officer)
INSERT INTO users (id, full_name, email, phone, password_hash, account_status, department, ward, trust_score)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Elena Vance',
    'elena.vance@metro.gov',
    '+91 94440 12345',
    '$2a$10$vd5MDvWnGAYUrw8W.y2rPexBtLsSVkVVMb.hq2z037IWNJ8oID59q',
    'ACTIVE',
    'Central Municipal Operations',
    'District 04 Headquarters',
    100
) ON CONFLICT (id) DO NOTHING;

-- Marcus Chen (Field Worker)
INSERT INTO users (id, full_name, email, phone, password_hash, account_status, department, ward, trust_score)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Marcus Chen',
    'marcus.chen@fieldops.gov',
    '+91 91760 98765',
    '$2a$10$vd5MDvWnGAYUrw8W.y2rPexBtLsSVkVVMb.hq2z037IWNJ8oID59q',
    'ACTIVE',
    'SDOT Rapid Asphalt Maintenance',
    'Unit 4 - SDOT Road Crew',
    96
) ON CONFLICT (id) DO NOTHING;

-- Priya Sharma (Platform Administrator)
INSERT INTO users (id, full_name, email, phone, password_hash, account_status, department, ward, trust_score)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'Priya Sharma',
    'priya.sharma@admin.metro.gov',
    '+91 98840 54321',
    '$2a$10$vd5MDvWnGAYUrw8W.y2rPexBtLsSVkVVMb.hq2z037IWNJ8oID59q',
    'ACTIVE',
    'Platform Security & Governance',
    'Greater Chennai Corporation',
    100
) ON CONFLICT (id) DO NOTHING;

-- 3. Assign Roles to Development Users
-- Alex Morgan -> CITIZEN
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000001', r.id FROM roles r WHERE r.name = 'CITIZEN'
ON CONFLICT DO NOTHING;

-- Elena Vance -> OFFICER
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000002', r.id FROM roles r WHERE r.name = 'OFFICER'
ON CONFLICT DO NOTHING;

-- Marcus Chen -> WORKER
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000003', r.id FROM roles r WHERE r.name = 'WORKER'
ON CONFLICT DO NOTHING;

-- Priya Sharma -> ADMIN
INSERT INTO user_roles (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000004', r.id FROM roles r WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
