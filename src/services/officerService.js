import { apiClient } from './apiClient.js';
import { mapBackendComplaintToFrontend } from './complaintService.js';

// Seed field workers with both database UUIDs and legacy identifiers
export const VERIFIED_FIELD_WORKERS = [
  {
    id: '00000000-0000-0000-0000-000000000003',
    legacyId: 'usr-003',
    name: 'Marcus Chen',
    email: 'marcus.chen@fieldops.gov',
    phone: '+91 91760 98765',
    role: 'WORKER',
    department: 'SDOT Rapid Asphalt Maintenance',
    unit: 'Unit 4 - SDOT Road Crew',
    status: 'ACTIVE',
    trustScore: 96
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    legacyId: 'usr-004',
    name: 'David Kalu',
    email: 'david.kalu@waterworks.gov',
    phone: '+91 98840 54321',
    role: 'WORKER',
    department: 'Sanitation & Pipeline Emergency',
    unit: 'Water & Sewerage Div 3',
    status: 'ACTIVE',
    trustScore: 94
  }
];

export const resolveWorkerUuid = (idOrLegacy) => {
  if (!idOrLegacy) return '00000000-0000-0000-0000-000000000003';
  const str = String(idOrLegacy).trim();
  if (str === 'usr-003' || str.toLowerCase() === 'marcus' || str.toLowerCase().includes('chen')) {
    return '00000000-0000-0000-0000-000000000003';
  }
  const matched = VERIFIED_FIELD_WORKERS.find(w => w.id === str || w.legacyId === str);
  if (matched) return matched.id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  return '00000000-0000-0000-0000-000000000003';
};

export const officerService = {
  /**
   * Fetch full municipal triage queue with optional filtering
   */
  getQueue: async (params = {}) => {
    const response = await apiClient.complaints.list(params);
    const data = response?.data || response;
    const content = Array.isArray(data) ? data : (data?.content || []);
    return content.map(mapBackendComplaintToFrontend);
  },

  /**
   * Fetch full complaint record with status history for officer inspection
   */
  getComplaintDetail: async (id) => {
    if (!id) throw new Error('Complaint ID is required');
    const [complaintRes, historyRes] = await Promise.allSettled([
      apiClient.complaints.getById(id),
      apiClient.complaints.getHistory(id)
    ]);

    if (complaintRes.status === 'rejected') {
      throw complaintRes.reason;
    }

    const rawComplaint = complaintRes.value?.data || complaintRes.value;
    const mapped = mapBackendComplaintToFrontend(rawComplaint);

    if (historyRes.status === 'fulfilled' && historyRes.value) {
      const historyData = historyRes.value?.data || historyRes.value;
      if (Array.isArray(historyData) && historyData.length > 0) {
        mapped.progressNotes = historyData.map(h => ({
          id: h.id,
          author: h.changedByName || 'Municipal Dispatch',
          timestamp: h.timestamp || h.createdAt,
          note: h.notes || `Status transitioned from ${h.previousStatus || 'Initial'} to ${h.newStatus}.`,
          status: h.newStatus
        }));
      }
    }

    return mapped;
  },

  /**
   * Dispatch work order to field technician via POST /api/complaints/{id}/assign
   */
  assignWorker: async (complaintId, workerId, notes = '') => {
    if (!complaintId) throw new Error('Complaint ID is required for assignment');
    const validUuid = resolveWorkerUuid(workerId);
    const res = await apiClient.complaints.assignWorker(complaintId, validUuid, notes);
    const data = res?.data || res;
    return mapBackendComplaintToFrontend(data);
  },

  /**
   * Reject / Clarify complaint intake via POST /api/complaints/{id}/status
   */
  rejectComplaint: async (complaintId, reason) => {
    if (!complaintId) throw new Error('Complaint ID is required');
    const res = await apiClient.complaints.updateStatus(complaintId, {
      status: 'REJECTED',
      notes: reason || 'Intake rejected by municipal officer.'
    });
    const data = res?.data || res;
    return mapBackendComplaintToFrontend(data);
  },

  /**
   * Retrieve eligible field workers for dispatch
   */
  getFieldWorkers: async () => {
    return [...VERIFIED_FIELD_WORKERS];
  },

  /**
   * Step 4D: Retrieve resolution verification queue (status = RESOLUTION_SUBMITTED)
   */
  getVerificationQueue: async (params = {}) => {
    const queryParams = { status: 'RESOLUTION_SUBMITTED', ...params };
    const response = await apiClient.complaints.list(queryParams);
    const data = response?.data || response;
    const content = Array.isArray(data) ? data : (data?.content || []);
    return content.map(mapBackendComplaintToFrontend);
  },

  /**
   * Step 4D: Retrieve resolution verification detail by complaint ID or Reference
   */
  getVerificationDetail: async (id) => {
    return officerService.getComplaintDetail(id);
  },

  /**
   * Step 4D: Officer resolution adjudication (APPROVE -> PENDING_CITIZEN_CONFIRMATION, REQUEST_REWORK -> REWORK_REQUESTED)
   */
  verifyResolution: async (complaintId, decision, remarks = '', locationAcknowledgement = '') => {
    if (!complaintId) throw new Error('Complaint ID is required for verification.');

    if (decision === 'APPROVE') {
      const notes = remarks || 'Resolution evidence inspected and verified by municipal officer; awaiting citizen confirmation.';
      const payload = {
        status: 'PENDING_CITIZEN_CONFIRMATION',
        notes
      };
      if (locationAcknowledgement && locationAcknowledgement.trim()) {
        payload.locationAcknowledgement = locationAcknowledgement.trim();
      }
      const res = await apiClient.complaints.updateStatus(complaintId, payload);
      const data = res?.data || res;
      return mapBackendComplaintToFrontend(data);
    } else if (decision === 'REQUEST_REWORK') {
      if (!remarks || !remarks.trim()) {
        const err = new Error('A meaningful reason is required when requesting rework.');
        err.status = 400;
        throw err;
      }
      const res = await apiClient.complaints.updateStatus(complaintId, {
        status: 'REWORK_REQUESTED',
        notes: remarks.trim()
      });
      const data = res?.data || res;
      return mapBackendComplaintToFrontend(data);
    } else {
      throw new Error(`Unsupported verification decision: ${decision}. Allowed decisions: APPROVE, REQUEST_REWORK.`);
    }
  },

  /**
   * Phase 4: Officer adjudication of AI triage recommendation (ACCEPT, OVERRIDE, DISMISS)
   */
  adjudicateAiTriage: async (complaintId, payload) => {
    if (!complaintId) throw new Error('Complaint ID is required for adjudication');
    const res = await apiClient.complaints.adjudicateAiTriage(complaintId, payload);
    const data = res?.data || res;
    return mapBackendComplaintToFrontend(data);
  },

  /**
   * Phase 4: Fetch duplicate candidates for complaint
   */
  getDuplicateCandidates: async (complaintId) => {
    if (!complaintId) throw new Error('Complaint ID is required to fetch duplicates');
    const res = await apiClient.complaints.getDuplicates(complaintId);
    const data = res?.data || res;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Phase 4: Link complaint as duplicate to parent complaint
   */
  linkDuplicateComplaint: async (complaintId, payload) => {
    if (!complaintId) throw new Error('Complaint ID is required to link duplicate');
    const res = await apiClient.complaints.linkDuplicate(complaintId, payload);
    const data = res?.data || res;
    return mapBackendComplaintToFrontend(data);
  },

  /**
   * Phase 6: Fetch live operational analytics summary computed from PostgreSQL aggregates
   */
  getAnalyticsSummary: async (params = {}) => {
    return await apiClient.officer.getAnalyticsSummary(params);
  },

  /**
   * Fetch Closure Trust Scores per ward and per officer (officer, supervisor, admin)
   */
  getClosureTrustScores: async (params = {}) => {
    return await apiClient.officer.getClosureTrustScores(params);
  },

  /**
   * Fetch Public Closure Trust Scores per ward (public transparency page; never per person)
   */
  getPublicClosureTrustScores: async (params = {}) => {
    return await apiClient.complaints.getPublicTrustScores(params);
  }
};

export default officerService;
