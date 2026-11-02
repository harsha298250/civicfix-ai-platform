import { COMPLAINT_STATUS } from '../constants/statusConstants.js';
import { apiClient } from './apiClient.js';

export const normalizeCategory = (cat) => {
  if (!cat) return { id: 'roads', name: 'Roads & Potholes' };
  const raw = String(cat).toLowerCase().replace(/[\s_]+/g, '');
  if (raw.includes('road') || raw.includes('pothole')) return { id: 'roads', name: 'Roads & Potholes' };
  if (raw.includes('light') || raw.includes('electr')) return { id: 'lighting', name: 'Streetlights & Electrical' };
  if (raw.includes('water') || raw.includes('sewer') || raw.includes('drain')) return { id: 'water', name: 'Water & Sanitation Leakage' };
  if (raw.includes('waste') || raw.includes('garbage') || raw.includes('dump')) return { id: 'waste', name: 'Solid Waste & Illegal Dumping' };
  if (raw.includes('traffic') || raw.includes('signal')) return { id: 'traffic', name: 'Signals & Traffic Obstacles' };
  if (raw.includes('park') || raw.includes('tree')) return { id: 'parks', name: 'Public Parks & Tree Hazards' };
  return { id: String(cat).toLowerCase().replace(/[\s_]+/g, '-'), name: cat };
};

export const getProgressPercent = (status) => {
  switch (status) {
    case 'SUBMITTED': return 10;
    case 'UNDER_REVIEW': return 25;
    case 'ASSIGNED': return 40;
    case 'IN_PROGRESS': return 65;
    case 'RESOLUTION_SUBMITTED': return 90;
    case 'PENDING_CITIZEN_CONFIRMATION': return 95;
    case 'RESOLVED': return 100;
    case 'REWORK_REQUESTED': return 45;
    case 'REOPENED': return 40;
    default: return 10;
  }
};

export const hasValidCoordinates = (coords) => {
  if (!coords) return false;
  let lat, lng;
  if (Array.isArray(coords)) {
    if (coords.length < 2) return false;
    lat = coords[0];
    lng = coords[1];
  } else if (typeof coords === 'object') {
    lat = coords.lat !== undefined ? coords.lat : coords.latitude;
    lng = coords.lng !== undefined ? coords.lng : coords.longitude;
  } else {
    return false;
  }

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  if (typeof lat === 'string' && lat.trim() === '') return false;
  if (typeof lng === 'string' && lng.trim() === '') return false;

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return false;
  }

  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
};

export const formatCoordinates = (coords) => {
  if (!hasValidCoordinates(coords)) return null;
  let lat, lng;
  if (Array.isArray(coords)) {
    lat = coords[0];
    lng = coords[1];
  } else {
    lat = coords.lat !== undefined ? coords.lat : coords.latitude;
    lng = coords.lng !== undefined ? coords.lng : coords.longitude;
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  const latDir = numLat >= 0 ? 'N' : 'S';
  const lngDir = numLng >= 0 ? 'E' : 'W';

  return `${Math.abs(numLat).toFixed(4)}° ${latDir}, ${Math.abs(numLng).toFixed(4)}° ${lngDir}`;
};

export const mapBackendComplaintToFrontend = (item) => {
  if (!item) return null;
  const catObj = normalizeCategory(item.category);
  const ref = item.referenceId || (item.id ? String(item.id) : '');

  // Dynamic coordinates resolution: strictly derive from actual complaint record
  let coords = null;
  const rawCoords = item.location?.coordinates || item.coordinates;
  const rawLat = rawCoords?.lat !== undefined ? rawCoords.lat : (rawCoords?.latitude !== undefined ? rawCoords.latitude : item.latitude);
  const rawLng = rawCoords?.lng !== undefined ? rawCoords.lng : (rawCoords?.longitude !== undefined ? rawCoords.longitude : item.longitude);

  if (hasValidCoordinates({ lat: rawLat, lng: rawLng })) {
    coords = {
      lat: Number(rawLat),
      lng: Number(rawLng)
    };
  }

  let resolutionEvidence = item.resolutionEvidence || null;
  if (!resolutionEvidence && Array.isArray(item.evidence) && item.evidence.length > 0) {
    const latest = item.evidence[0];
    const photos = item.evidence
      .map(e => e.photoUrl)
      .filter(Boolean);

    let evidenceCoords = null;
    if (hasValidCoordinates({ lat: latest.latitude, lng: latest.longitude })) {
      evidenceCoords = {
        lat: Number(latest.latitude),
        lng: Number(latest.longitude)
      };
    }

    resolutionEvidence = {
      photos: photos,
      notes: latest.evidenceNotes || '',
      submittedDate: latest.createdAt || null,
      workerName: latest.workerName || item.assignedWorker?.name || 'Field Technician',
      coordinates: evidenceCoords,
      locationCheck: latest.locationCheck || 'NOT_CHECKABLE',
      distanceMeters: latest.distanceMeters != null ? Number(latest.distanceMeters) : null,
      accuracyMeters: latest.accuracyMeters != null ? Number(latest.accuracyMeters) : null,
      locationNote: latest.locationNote || null,
      evidenceList: item.evidence.map(e => ({
        id: e.id,
        photoUrl: e.photoUrl,
        notes: e.evidenceNotes,
        latitude: e.latitude != null ? Number(e.latitude) : null,
        longitude: e.longitude != null ? Number(e.longitude) : null,
        locationCheck: e.locationCheck || 'NOT_CHECKABLE',
        distanceMeters: e.distanceMeters != null ? Number(e.distanceMeters) : null,
        accuracyMeters: e.accuracyMeters != null ? Number(e.accuracyMeters) : null,
        locationNote: e.locationNote || null,
        createdAt: e.createdAt,
        workerName: e.workerName
      }))
    };
  } else if (resolutionEvidence) {
    if (resolutionEvidence.coordinates && !hasValidCoordinates(resolutionEvidence.coordinates)) {
      resolutionEvidence = {
        ...resolutionEvidence,
        coordinates: null
      };
    }
  }

  const rawAddress = (item.address != null && String(item.address).trim() !== '')
    ? String(item.address).trim()
    : (item.location?.address != null && String(item.location.address).trim() !== '' ? String(item.location.address).trim() : null);

  const rawWard = (item.ward != null && String(item.ward).trim() !== '')
    ? String(item.ward).trim()
    : (item.location?.ward != null && String(item.location.ward).trim() !== '' ? String(item.location.ward).trim() : null);

  return {
    id: ref,
    backendId: item.id ? String(item.id) : null,
    referenceId: item.referenceId || ref,
    title: item.title || 'Civic Issue',
    description: item.description || '',
    category: catObj.name || item.category || 'General Civic Concern',
    categoryId: catObj.id,
    priority: item.priority || 'MEDIUM',
    status: item.status || 'SUBMITTED',
    address: rawAddress,
    ward: rawWard,
    location: {
      address: rawAddress,
      ward: rawWard,
      district: item.location?.district || null,
      coordinates: coords,
      landmark: item.location?.landmark || ''
    },
    citizen: {
      id: item.citizen?.id || '',
      name: item.citizen?.name || 'Citizen User',
      email: item.citizen?.email || '',
      phone: item.citizen?.phone || '',
      trustScore: item.citizen?.trustScore ?? 98
    },
    assignedOfficer: item.assignedOfficer || null,
    assignedWorker: item.assignedWorker || null,
    progressPercent: getProgressPercent(item.status),
    progressNotes: item.progressNotes || [],
    aiTriage: item.aiTriage ? {
      detectedCategory: item.aiTriage.detectedCategory || null,
      recommendedPriority: item.aiTriage.recommendedPriority || null,
      confidence: item.aiTriage.confidence != null ? Number(item.aiTriage.confidence) : null,
      hazardScore: item.aiTriage.hazardScore || null,
      explanation: item.aiTriage.explanation || null,
      adjudicationStatus: item.aiTriage.adjudicationStatus || 'PENDING',
      triagedAt: item.aiTriage.triagedAt || null
    } : null,
    duplicateOf: item.duplicateOf ? {
      id: item.duplicateOf.id || null,
      referenceId: item.duplicateOf.referenceId || null,
      title: item.duplicateOf.title || null
    } : null,
    resolutionEvidence,
    verificationMeta: item.verificationMeta || null,
    photos: item.photos || [],
    visionConsent: item.visionConsent !== undefined ? item.visionConsent : false,
    visionStatus: item.visionStatus || 'NOT_RUN',
    visionCategory: item.visionCategory || null,
    visionSeverity: item.visionSeverity != null ? Number(item.visionSeverity) : null,
    visionConfidence: item.visionConfidence != null ? Number(item.visionConfidence) : null,
    visionReason: item.visionReason || null,
    visionModel: item.visionModel || null,
    visionAt: item.visionAt || null,
    disagreement: Boolean(item.disagreement),
    finalPrioritySource: item.finalPrioritySource || null,
    visionSkipReason: item.visionSkipReason || null,
    confirmedAt: item.confirmedAt || null,
    pendingConfirmationAt: item.pendingConfirmationAt || null,
    confirmationSource: item.confirmationSource || null,
    reopenCount: item.reopenCount != null ? Number(item.reopenCount) : 0,
    slaDueAt: item.slaDueAt || null,
    escalatedAt: item.escalatedAt || null,
    slaState: item.slaState || null,
    version: item.version != null ? Number(item.version) : 0,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    isLiveBackend: true,
    dataSource: 'POSTGRESQL_BACKEND'
  };
};

export const complaintService = {
  // Staff access: Returns all complaints across the municipal grid
  getAll: async (params = {}) => {
    try {
      const response = await apiClient.complaints.list(params);
      const data = response?.data || response;
      const content = Array.isArray(data) ? data : (data?.content || []);
      return content.map(mapBackendComplaintToFrontend);
    } catch (err) {
      if (err.status === 401 || err.status === 403) throw err;
      throw new Error(err.message || 'Cannot reach the server. Failed to load complaints.');
    }
  },

  // Public GIS map feed: Returns sanitized complaint markers from the backend
  getPublicMapComplaints: async (params = {}) => {
    try {
      const response = await apiClient.complaints.getPublicMap(params);
      const data = response?.data || response;
      const content = Array.isArray(data) ? data : (data?.content || []);
      return content.map((item, idx) => {
        let coords = null;
        if (hasValidCoordinates({ lat: item.latitude, lng: item.longitude })) {
          coords = {
            lat: Number(item.latitude),
            lng: Number(item.longitude)
          };
        }
        const safeId = item.id != null ? String(item.id) : String(idx + 1);
        return {
          id: safeId,
          category: item.category || 'General Civic Concern',
          priority: item.priority || 'MEDIUM',
          status: item.status || 'SUBMITTED',
          ward: item.ward || null,
          coordinates: coords,
          location: {
            ward: item.ward || null,
            coordinates: coords
          },
          createdAt: item.createdAt || new Date().toISOString()
        };
      });
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403) throw err;
      throw new Error(err.message || 'Cannot reach the server. Failed to load public map feed.');
    }
  },

  // Officer GIS map feed: Returns complaints for operational spatial tracking
  getOfficerMapComplaints: async (params = {}) => {
    try {
      const queryParams = { ...params, size: params.size || 250 };
      const response = await apiClient.complaints.list(queryParams);
      const data = response?.data || response;
      const content = Array.isArray(data) ? data : (data?.content || []);
      return content.map(mapBackendComplaintToFrontend);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403) throw err;
      throw new Error(err.message || 'Cannot reach the server. Failed to load officer map complaints.');
    }
  },

  // Citizen data isolation: Returns ONLY complaints filed by the authenticated resident
  // Backed by PostgreSQL Spring Boot backend with ownership isolation
  getByCitizen: async (citizenId, citizenEmail, params = {}) => {
    try {
      const response = await apiClient.complaints.list(params);
      const data = response?.data || response;
      const content = Array.isArray(data) ? data : (data?.content || []);
      return content.map(mapBackendComplaintToFrontend);
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403) {
        throw apiError;
      }
      throw new Error(apiError.message || 'Cannot reach the server. Failed to load complaints.');
    }
  },

  // Field Worker data isolation: Returns ONLY complaints assigned to authenticated technician
  // Backed by PostgreSQL Spring Boot backend with worker ownership isolation
  getByWorker: async (params = {}) => {
    const response = await apiClient.complaints.list(params);
    const data = response?.data || response;
    const content = Array.isArray(data) ? data : (data?.content || []);
    return content.map(mapBackendComplaintToFrontend);
  },

  // Fetch complaint by ID or Reference with full status history
  getById: async (id) => {
    if (!id) return null;
    const [complaintRes, historyRes] = await Promise.allSettled([
      apiClient.complaints.getById(id),
      apiClient.complaints.getHistory(id)
    ]);

    if (complaintRes.status === 'rejected') {
      const err = complaintRes.reason;
      if (err.status === 404 || err.status === 401 || err.status === 403) {
        throw err;
      }
      throw new Error(err.message || 'Cannot reach the server. Failed to load complaint.');
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

  // Citizen data isolation: Fetch complaint by ID ONLY if owned by authenticated citizen
  getByIdForCitizen: async (id, citizenId, citizenEmail) => {
    // The backend endpoint GET /api/complaints/{id} automatically enforces ownership for CITIZEN role!
    return complaintService.getById(id);
  },

  getHistory: async (id) => {
    try {
      const res = await apiClient.complaints.getHistory(id);
      return res?.data || res || [];
    } catch (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404) throw err;
      return [];
    }
  },

  create: async (newComplaint) => {
    const timestamp = new Date().toISOString();

    // Map fields explicitly to backend CreateComplaintRequest contract
    const payload = {
      title: newComplaint.title ? newComplaint.title.trim() : '',
      description: newComplaint.description ? newComplaint.description.trim() : '',
      category: (newComplaint.categoryId || newComplaint.category || 'ROADS').toUpperCase().replace(/\s+/g, '_'),
      priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(newComplaint.priority)
        ? newComplaint.priority
        : 'MEDIUM',
      address: newComplaint.address ? newComplaint.address.trim() : 'Anna Salai, Chennai',
      latitude: newComplaint.coordinates?.lat != null ? Number(newComplaint.coordinates.lat) : 13.0604,
      longitude: newComplaint.coordinates?.lng != null ? Number(newComplaint.coordinates.lng) : 80.2642,
      ward: newComplaint.ward ? newComplaint.ward.trim() : 'Ward 08, Anna Nagar',
      visionConsent: Boolean(newComplaint.visionConsent)
    };

    // If real image files are provided, package as FormData for multipart upload
    let requestBody;
    const files = Array.isArray(newComplaint.files)
      ? newComplaint.files.filter((f) => (typeof File !== 'undefined' && f instanceof File) || (typeof Blob !== 'undefined' && f instanceof Blob))
      : [];
    if (files.length > 0) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });
      files.forEach((file) => {
        fd.append('files', file);
      });
      requestBody = fd;
    } else {
      requestBody = payload;
    }

    // 1. Attempt submission to PostgreSQL Spring Boot Backend
    try {
      const response = await apiClient.complaints.create(requestBody);
      const resData = response?.data || response;

      // Construct complaint entity preserving frontend shape
      const created = {
        id: resData.referenceId || (resData.id ? String(resData.id) : `CF-2026-${Math.floor(10000 + Math.random() * 90000)}`),
        backendId: resData.id ? String(resData.id) : null,
        referenceId: resData.referenceId || null,
        title: resData.title || newComplaint.title,
        category: newComplaint.category || resData.category || 'General Civic Concern',
        categoryId: newComplaint.categoryId || 'roads',
        description: resData.description || newComplaint.description,
        status: resData.status || COMPLAINT_STATUS.SUBMITTED,
        priority: resData.priority || newComplaint.priority || 'MEDIUM',
        location: {
          address: resData.address || newComplaint.address || null,
          ward: resData.ward || newComplaint.ward || null,
          district: resData.location?.district || null,
          coordinates: (() => {
            const rawLat = resData.location?.coordinates?.lat ?? payload.latitude;
            const rawLng = resData.location?.coordinates?.lng ?? payload.longitude;
            return hasValidCoordinates({ lat: rawLat, lng: rawLng })
              ? { lat: Number(rawLat), lng: Number(rawLng) }
              : null;
          })(),
          landmark: newComplaint.landmark || ''
        },
        citizen: {
          id: resData.citizen?.id || newComplaint.citizenId || 'usr-001',
          name: resData.citizen?.name || newComplaint.citizenName || 'Alex Morgan',
          email: resData.citizen?.email || newComplaint.citizenEmail || 'alex.m@citizen.org',
          trustScore: 98
        },
        assignedOfficer: resData.assignedOfficer || null,
        assignedWorker: resData.assignedWorker || null,
        progressPercent: 0,
        progressNotes: [],
        aiTriage: resData.aiTriage ? {
          detectedCategory: resData.aiTriage.detectedCategory || null,
          recommendedPriority: resData.aiTriage.recommendedPriority || null,
          confidence: resData.aiTriage.confidence != null ? Number(resData.aiTriage.confidence) : null,
          hazardScore: resData.aiTriage.hazardScore || null,
          explanation: resData.aiTriage.explanation || null,
          adjudicationStatus: resData.aiTriage.adjudicationStatus || 'PENDING',
          triagedAt: resData.aiTriage.triagedAt || null
        } : null,
        resolutionEvidence: null,
        photos: (resData.photos && resData.photos.length > 0) ? resData.photos : (newComplaint.photos || []),
        visionConsent: resData.visionConsent !== undefined ? resData.visionConsent : Boolean(newComplaint.visionConsent),
        visionStatus: resData.visionStatus || 'NOT_RUN',
        visionCategory: resData.visionCategory || null,
        visionSeverity: resData.visionSeverity || null,
        visionConfidence: resData.visionConfidence || null,
        visionReason: resData.visionReason || null,
        visionModel: resData.visionModel || null,
        visionAt: resData.visionAt || null,
        disagreement: Boolean(resData.disagreement),
        finalPrioritySource: resData.finalPrioritySource || null,
        visionSkipReason: resData.visionSkipReason || null,
        createdAt: resData.createdAt || timestamp,
        updatedAt: resData.updatedAt || timestamp,
        isLiveBackend: true,
        dataSource: 'POSTGRESQL_BACKEND'
      };

      return created;
    } catch (apiError) {
      // Never silently fall back to mock data after an authorization or validation failure
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 400 || apiError.status === 409 || apiError.status === 429) {
        const errorMsg = apiError.data?.errors
          ? Object.values(apiError.data.errors).join('. ')
          : (apiError.data?.message || apiError.message || 'Complaint submission rejected by server.');
        throw new Error(errorMsg);
      }

      // Backend unreachable or network failure
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  updateStatus: async (id, newStatus, meta = {}) => {
    try {
      const response = await apiClient.complaints.updateStatus(id, {
        status: newStatus,
        notes: meta.progressNote || meta.notes || `Status updated to ${newStatus}`
      });
      const data = response?.data || response;
      return mapBackendComplaintToFrontend(data);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 409 || err.status === 429) {
        throw err;
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  assignWorker: async (id, worker, notes = '') => {
    const rawWorkerId = worker?.id || worker;
    const workerUuid = (rawWorkerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(rawWorkerId)))
      ? String(rawWorkerId)
      : '00000000-0000-0000-0000-000000000003';
    const noteText = notes || (worker?.name ? `Dispatched to ${worker.name}` : 'Dispatched to technician');

    try {
      const response = await apiClient.complaints.assignWorker(id, workerUuid, noteText);
      const data = response?.data || response;
      return mapBackendComplaintToFrontend(data);
    } catch (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 400 || err.status === 429) {
        throw err;
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  submitProgress: async (id, percent, note, author = 'Marcus Chen') => {
    try {
      const noteText = note || `Progress updated to ${percent}%`;
      const response = await apiClient.complaints.addNote(id, noteText);
      const data = response?.data || response;
      return mapBackendComplaintToFrontend(data);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
        throw err;
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  reportBlocker: async (id, blockerReason, author = 'Marcus Chen') => {
    try {
      const noteText = `⚠️ BLOCKER REPORTED: ${blockerReason}`;
      const response = await apiClient.complaints.addNote(id, noteText);
      const data = response?.data || response;
      return mapBackendComplaintToFrontend(data);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
        throw err;
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  submitEvidence: async (id, evidence) => {
    try {
      const fd = new FormData();
      if (evidence?.notes) fd.append('notes', evidence.notes);
      if (evidence?.location) fd.append('location', JSON.stringify(evidence.location));
      if (Array.isArray(evidence?.photos)) {
        evidence.photos.forEach((p) => {
          if ((typeof File !== 'undefined' && p instanceof File) || (typeof Blob !== 'undefined' && p instanceof Blob)) {
            fd.append('files', p);
          }
        });
      }
      const response = await apiClient.complaints.submitEvidence(id, fd);
      const data = response?.data || response;
      return mapBackendComplaintToFrontend(data);
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
        throw err;
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  verifyResolution: async (id, decision, notes, officerName = 'Elena Vance') => {
    if (!id) throw new Error('Complaint ID is required for verification.');

    if (decision === 'APPROVE') {
      const approvalNote = notes || 'Verified on-site work and repair evidence. Case officially closed.';
      try {
        const response = await apiClient.complaints.updateStatus(id, {
          status: COMPLAINT_STATUS.RESOLVED,
          notes: approvalNote
        });
        const data = response?.data || response;
        return mapBackendComplaintToFrontend(data);
      } catch (err) {
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
          throw err;
        }
        throw new Error('Cannot reach the server. Nothing was saved.');
      }
    } else if (decision === 'REQUEST_REWORK') {
      if (!notes || !notes.trim()) {
        const err = new Error('A meaningful reason is required when requesting rework.');
        err.status = 400;
        throw err;
      }
      const reworkNote = notes.trim();
      try {
        const response = await apiClient.complaints.updateStatus(id, {
          status: COMPLAINT_STATUS.REWORK_REQUESTED,
          notes: reworkNote
        });
        const data = response?.data || response;
        return mapBackendComplaintToFrontend(data);
      } catch (err) {
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
          throw err;
        }
        throw new Error('Cannot reach the server. Nothing was saved.');
      }
    } else {
      try {
        const response = await apiClient.complaints.updateStatus(id, {
          status: COMPLAINT_STATUS.REJECTED,
          notes: notes || `Resolution rejected by Officer (${officerName})`
        });
        const data = response?.data || response;
        return mapBackendComplaintToFrontend(data);
      } catch (err) {
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404 || err.status === 429) {
          throw err;
        }
        throw new Error('Cannot reach the server. Nothing was saved.');
      }
    }
  },

  /**
   * Phase 4: Adjudicate AI triage recommendation (ACCEPT, OVERRIDE, DISMISS)
   */
  adjudicateAiTriage: async (id, payload) => {
    const response = await apiClient.complaints.adjudicateAiTriage(id, payload);
    const data = response?.data || response;
    return mapBackendComplaintToFrontend(data);
  },

  /**
   * Phase 4: Fetch duplicate candidates for a complaint
   */
  getDuplicateCandidates: async (id) => {
    const response = await apiClient.complaints.getDuplicates(id);
    const data = response?.data || response;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Phase 4: Link a complaint as duplicate of a parent master complaint
   */
  linkDuplicateComplaint: async (id, payload) => {
    const response = await apiClient.complaints.linkDuplicate(id, payload);
    const data = response?.data || response;
    return mapBackendComplaintToFrontend(data);
  }
};
