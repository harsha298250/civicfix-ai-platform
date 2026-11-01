import { apiClient } from './apiClient.js';
import { mapBackendComplaintToFrontend } from './complaintService.js';

/**
 * CivicFix AI — Dedicated Field Worker Service Module (Sprint 3, Step 4A)
 * 
 * Responsibilities:
 * - Retrieve real-time assigned repair orders and dispatches from Spring Boot backend
 * - Enforce field worker identity isolation (strictly isolated to complaints assigned to authenticated worker)
 * - Fetch detailed work order specification with immutable status/dispatch audit history
 * - Strict HTTP error propagation (401 Unauthorized, 403 Forbidden, 404 Not Found)
 * - No mock data fallback or fabricated records for invalid/restricted task IDs
 */

export const workerService = {
  /**
   * Retrieve real-time work orders assigned to the authenticated field worker.
   * Backend endpoint GET /api/complaints automatically filters by assigned_worker_id = principal.id
   * for users holding ROLE_WORKER.
   * 
   * @param {Object} params - Optional query params (status, category, page, size)
   * @returns {Promise<Array>} List of mapped work order complaints
   */
  getAssignedTasks: async (params = {}) => {
    const response = await apiClient.complaints.list(params);
    const data = response?.data || response;
    const content = Array.isArray(data) ? data : (data?.content || []);
    return content.map(mapBackendComplaintToFrontend);
  },

  /**
   * Fetch full work order specification and status history by ID or human-readable reference.
   * The backend endpoint GET /api/complaints/{id} enforces worker ownership:
   * Returns HTTP 403 Forbidden if the complaint is not assigned to the authenticated technician.
   * Returns HTTP 404 Not Found if the complaint ID or reference does not exist.
   * 
   * @param {string} taskId - UUID or human-readable reference ID (e.g. CF-2026-00124)
   * @returns {Promise<Object>} Fully hydrated work order with audit history
   */
  getTaskDetail: async (taskId) => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID or Reference is required.');
      err.status = 400;
      throw err;
    }

    const cleanId = String(taskId).trim();

    const [complaintRes, historyRes] = await Promise.allSettled([
      apiClient.complaints.getById(cleanId),
      apiClient.complaints.getHistory(cleanId)
    ]);

    if (complaintRes.status === 'rejected') {
      throw complaintRes.reason;
    }

    const rawComplaint = complaintRes.value?.data || complaintRes.value;
    if (!rawComplaint) {
      const notFoundErr = new Error(`Work Order #${cleanId} not found in municipal database.`);
      notFoundErr.status = 404;
      throw notFoundErr;
    }

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
   * Transition work order status to IN_PROGRESS.
   * Validated on backend to ensure:
   * - Worker is the assigned technician
   * - Previous status is ASSIGNED or REWORK_REQUESTED
   * - Creates immutable status history entry and audit log
   * 
   * @param {string} taskId - UUID or reference ID
   * @param {string} [notes] - On-site arrival notes
   * @returns {Promise<Object>} Updated work order with refreshed history
   */
  startWork: async (taskId, notes = '') => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID is required to start work.');
      err.status = 400;
      throw err;
    }
    const cleanId = String(taskId).trim();
    const payload = {
      status: 'IN_PROGRESS',
      notes: notes || 'Technician arrived on site and initiated work perimeter.'
    };
    await apiClient.complaints.updateStatus(cleanId, payload);
    return workerService.getTaskDetail(cleanId);
  },

  /**
   * Record on-site operational progress note or milestone.
   * Validated on backend to ensure worker is assigned to the complaint.
   * Appends to complaint_status_history and audit_logs.
   * 
   * @param {string} taskId - UUID or reference ID
   * @param {string} note - Operational note
   * @returns {Promise<Object>} Updated work order with refreshed history
   */
  addProgressNote: async (taskId, note) => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID is required.');
      err.status = 400;
      throw err;
    }
    if (!note || !String(note).trim()) {
      const err = new Error('Progress note cannot be empty.');
      err.status = 400;
      throw err;
    }
    const cleanId = String(taskId).trim();
    await apiClient.complaints.addNote(cleanId, String(note).trim());
    return workerService.getTaskDetail(cleanId);
  },

  /**
   * Report an operational field blocker to District Operations Command.
   * Records blocker note in status history.
   * 
   * @param {string} taskId - UUID or reference ID
   * @param {string} blockerReason - Reason for delay/hazard
   * @returns {Promise<Object>} Updated work order with refreshed history
   */
  reportBlocker: async (taskId, blockerReason) => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID is required.');
      err.status = 400;
      throw err;
    }
    const noteText = `⚠️ BLOCKER REPORTED: ${blockerReason || 'Unspecified site obstacle'}`;
    const cleanId = String(taskId).trim();
    await apiClient.complaints.addNote(cleanId, noteText);
    return workerService.getTaskDetail(cleanId);
  },

  /**
   * Submit repair completion evidence with authentic photos, completion narrative,
   * and optional device-reported coordinates.
   * 
   * Enforces:
   * - Valid taskId
   * - Non-empty completion narrative
   * - At least 1 photo file provided
   * - Transitions work order from IN_PROGRESS -> RESOLUTION_SUBMITTED
   * 
   * @param {string} taskId - UUID or reference ID
   * @param {Object} options
   * @param {string} options.notes - Completion procedure narrative
   * @param {Array<File|Blob>} options.files - Authentic photo file objects
   * @param {number} [options.latitude] - Device reported latitude
   * @param {number} [options.longitude] - Device reported longitude
   * @param {number} [options.accuracy] - Device reported GPS accuracy in meters
   * @param {string} [options.locationNote] - Worker explanation note for location check (e.g. low accuracy or out of range)
   * @param {boolean} [options.deviceReported] - Device coordinates flag
   * @returns {Promise<Object>} Updated work order with refreshed evidence and history
   */
  submitEvidence: async (taskId, { notes, files = [], latitude = null, longitude = null, accuracy = null, locationNote = null, deviceReported = false } = {}) => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID is required for evidence submission.');
      err.status = 400;
      throw err;
    }
    if (!notes || !String(notes).trim()) {
      const err = new Error('Completion narrative notes are required.');
      err.status = 400;
      throw err;
    }
    if (!files || files.length === 0) {
      const err = new Error('At least one authentic repair photograph is required.');
      err.status = 400;
      throw err;
    }

    const cleanId = String(taskId).trim();
    const formData = new FormData();
    formData.append('notes', String(notes).trim());

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (latitude !== null && latitude !== undefined) {
      formData.append('latitude', String(latitude));
    }
    if (longitude !== null && longitude !== undefined) {
      formData.append('longitude', String(longitude));
    }
    if (accuracy !== null && accuracy !== undefined) {
      formData.append('accuracy', String(accuracy));
    }
    if (locationNote !== null && locationNote !== undefined && String(locationNote).trim()) {
      formData.append('locationNote', String(locationNote).trim());
    }
    if (deviceReported) {
      formData.append('deviceReported', 'true');
    }

    await apiClient.complaints.submitEvidence(cleanId, formData);
    return workerService.getTaskDetail(cleanId);
  },

  /**
   * Retrieve resolution evidence records for a complaint.
   * 
   * @param {string} taskId - UUID or reference ID
   * @returns {Promise<Array<Object>>} List of resolution evidence records
   */
  getEvidence: async (taskId) => {
    if (!taskId || !String(taskId).trim()) {
      const err = new Error('Task ID is required.');
      err.status = 400;
      throw err;
    }
    const cleanId = String(taskId).trim();
    const response = await apiClient.complaints.getEvidence(cleanId);
    return response?.data || [];
  }
};

export default workerService;
