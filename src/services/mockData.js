/**
 * CivicFix AI — Demo Persona Fixtures
 * 
 * NOTE: This file is preserved EXCLUSIVELY for development demo persona switching
 * (`authService.switchRole`) when `VITE_DEMO_MODE=true`.
 * 
 * All operational runtime paths (complaint intake, officer review, worker assignment,
 * resolution verification, user management, and audit event ledger) execute against
 * real Spring Boot REST APIs backed by PostgreSQL.
 * 
 * Deprecated mock complaints, mock audit logs, and `slaHoursRemaining` fields have been
 * permanently removed.
 */

export const INITIAL_USERS = [
  {
    id: 'usr-001',
    name: 'Alex Morgan',
    email: 'alex.m@citizen.org',
    role: 'CITIZEN',
    phone: '+91 98401 23456',
    ward: 'Ward 08, Anna Nagar',
    status: 'ACTIVE',
    trustScore: 98,
    avatar: 'AM',
    department: 'Resident Community Council',
    joinedDate: '15 Jan 2026'
  },
  {
    id: 'usr-002',
    name: 'Elena Vance',
    email: 'elena.vance@metro.gov',
    role: 'OFFICER',
    phone: '+91 94440 12345',
    ward: 'District 04 Headquarters',
    status: 'ACTIVE',
    trustScore: 100,
    avatar: 'EV',
    department: 'Central Municipal Operations',
    joinedDate: '10 Feb 2024'
  },
  {
    id: 'usr-003',
    name: 'Marcus Chen',
    email: 'marcus.chen@fieldops.gov',
    role: 'WORKER',
    phone: '+91 91760 98765',
    ward: 'Unit 4 - SDOT Road Crew',
    status: 'ACTIVE',
    trustScore: 96,
    avatar: 'MC',
    department: 'SDOT Rapid Asphalt Maintenance',
    joinedDate: '04 Mar 2025'
  },
  {
    id: 'usr-005',
    name: 'Priya Sharma',
    email: 'priya.sharma@admin.metro.gov',
    role: 'ADMIN',
    phone: '+91 98410 87654',
    ward: 'Metropolitan IT Governance',
    status: 'ACTIVE',
    trustScore: 100,
    avatar: 'PS',
    department: 'Municipal Digital Infrastructure',
    joinedDate: '01 Nov 2023'
  },
  {
    id: 'usr-007',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@metro.gov',
    role: 'SUPERVISOR',
    phone: '+91 98405 67890',
    ward: 'City Central, Greater Chennai',
    status: 'ACTIVE',
    trustScore: 100,
    avatar: 'SJ',
    department: 'Municipal Operations Command',
    joinedDate: '15 Mar 2024'
  }
];
