import { COMPLAINT_STATUS } from '../constants/statusConstants';
import { INITIAL_COMPLAINTS } from './mockData';
import { apiClient } from './apiClient.js';

const STORAGE_KEY = 'civicfix_complaints_v2';

const getStoredComplaints = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage unavailable, falling back to in-memory mock', e);
  }
  return INITIAL_COMPLAINTS;
};

const saveComplaints = (complaints) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
};

export const complaintService = {
  // Staff access: Returns all complaints across the municipal grid
  getAll: async () => {
    return [...getStoredComplaints()];
  },

  // Citizen data isolation: Returns ONLY complaints filed by the authenticated resident
  getByCitizen: async (citizenId, citizenEmail) => {
    const list = getStoredComplaints();
    if (!citizenId && !citizenEmail) return [];
    return list.filter(c => {
      const matchId = citizenId && c.citizen?.id === citizenId;
      const matchEmail = citizenEmail && c.citizen?.email?.toLowerCase() === citizenEmail.toLowerCase();
      return matchId || matchEmail;
    });
  },

  // Staff access: Fetch any complaint by ID
  getById: async (id) => {
    const list = getStoredComplaints();
    return list.find(c => c.id.toLowerCase() === id.toLowerCase()) || null;
  },

  // Citizen data isolation: Fetch complaint by ID ONLY if owned by authenticated citizen
  getByIdForCitizen: async (id, citizenId, citizenEmail) => {
    const list = getStoredComplaints();
    const complaint = list.find(c => c.id.toLowerCase() === id.toLowerCase());
    if (!complaint) return null;
    const matchId = citizenId && complaint.citizen?.id === citizenId;
    const matchEmail = citizenEmail && complaint.citizen?.email?.toLowerCase() === citizenEmail.toLowerCase();
    if (!matchId && !matchEmail) {
      // Access denied: complaint belongs to another citizen
      return null;
    }
    return complaint;
  },

  create: async (newComplaint) => {
    const list = getStoredComplaints();
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
      ward: newComplaint.ward ? newComplaint.ward.trim() : 'Ward 08, Anna Nagar'
    };

    // 1. Attempt submission to PostgreSQL Spring Boot Backend
    try {
      const response = await apiClient.complaints.create(payload);
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
          address: resData.address || newComplaint.address || 'Reported Location, Ward 08',
          ward: resData.ward || newComplaint.ward || 'Ward 08',
          district: 'District 4',
          coordinates: {
            lat: resData.location?.coordinates?.lat != null ? Number(resData.location.coordinates.lat) : payload.latitude,
            lng: resData.location?.coordinates?.lng != null ? Number(resData.location.coordinates.lng) : payload.longitude
          },
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
        aiTriage: {
          confidence: 96.5,
          detectedIssue: newComplaint.title,
          hazardScore: newComplaint.priority === 'CRITICAL' ? 'P1 - High Hazard' : 'P3 - Standard Triage',
          clusterCount: 1,
          duplicateIds: [],
          suggestedDept: 'Municipal Works',
          slaHoursRemaining: 48
        },
        resolutionEvidence: null,
        photos: newComplaint.photos || [],
        createdAt: resData.createdAt || timestamp,
        updatedAt: resData.updatedAt || timestamp,
        isLiveBackend: true,
        dataSource: 'POSTGRESQL_BACKEND'
      };

      // Also cache in local list so offline and legacy screens show it immediately
      const updated = [created, ...list];
      saveComplaints(updated);

      return created;
    } catch (apiError) {
      // MANDATORY SECURITY SAFEGUARD:
      // Never silently fall back to mock data after an authentication or authorization failure (401/403/400).
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 400) {
        const errorMsg = apiError.data?.errors
          ? Object.values(apiError.data.errors).join('. ')
          : (apiError.data?.message || apiError.message || 'Complaint submission rejected by server.');
        throw new Error(errorMsg);
      }

      // Check if it is a genuine network connection failure (backend unreachable)
      const isNetworkError =
        apiError.message &&
        (apiError.message.includes('Cannot connect to CivicFix backend') ||
         apiError.message.includes('Failed to fetch') ||
         apiError.message.includes('NetworkError') ||
         apiError.message.includes('ECONNREFUSED'));

      if (!isNetworkError) {
        throw new Error(apiError.data?.message || apiError.message || 'Backend server error during complaint submission.');
      }

      console.warn('[CivicFix Complaints] Backend unreachable. Storing complaint in local offline demo storage.');
    }

    // 2. Offline Demo Storage Fallback (Only executed when backend is unreachable)
    const id = `CF-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
    const complaint = {
      id,
      title: newComplaint.title,
      category: newComplaint.category || 'General Civic Concern',
      categoryId: newComplaint.categoryId || 'roads',
      description: newComplaint.description,
      status: COMPLAINT_STATUS.SUBMITTED,
      priority: newComplaint.priority || 'MEDIUM',
      location: {
        address: newComplaint.address || 'Reported Location, Ward 08',
        ward: newComplaint.ward || 'Ward 08',
        district: 'District 4',
        coordinates: newComplaint.coordinates || { lat: 13.0855, lng: 80.2105 },
        landmark: newComplaint.landmark || ''
      },
      citizen: {
        id: newComplaint.citizenId || 'usr-001',
        name: newComplaint.citizenName || 'Alex Morgan',
        email: newComplaint.citizenEmail || 'alex.m@citizen.org',
        trustScore: 98
      },
      assignedWorker: null,
      progressPercent: 0,
      progressNotes: [],
      aiTriage: {
        confidence: 96.5,
        detectedIssue: newComplaint.title,
        hazardScore: newComplaint.priority === 'CRITICAL' ? 'P1 - High Hazard' : 'P3 - Standard Triage',
        clusterCount: 1,
        duplicateIds: [],
        suggestedDept: 'Municipal Works',
        slaHoursRemaining: 48
      },
      resolutionEvidence: null,
      photos: newComplaint.photos || [],
      createdAt: timestamp,
      updatedAt: timestamp,
      isLiveBackend: false,
      isDemoMode: true,
      dataSource: 'LOCAL_STORAGE_DEMO'
    };

    const updated = [complaint, ...list];
    saveComplaints(updated);
    return complaint;
  },

  updateStatus: async (id, newStatus, meta = {}) => {
    const list = getStoredComplaints();
    const idx = list.findIndex(c => c.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) throw new Error(`Complaint ${id} not found`);

    const complaint = { ...list[idx] };
    complaint.status = newStatus;
    complaint.updatedAt = new Date().toISOString();

    if (meta.progressPercent !== undefined) {
      complaint.progressPercent = meta.progressPercent;
    }
    if (meta.progressNote) {
      complaint.progressNotes = [
        ...(complaint.progressNotes || []),
        {
          timestamp: new Date().toISOString(),
          author: meta.author || 'Crew Lead',
          note: meta.progressNote
        }
      ];
    }
    if (meta.resolutionEvidence) {
      complaint.resolutionEvidence = {
        ...meta.resolutionEvidence,
        submittedDate: new Date().toISOString()
      };
    }
    if (meta.verificationMeta) {
      complaint.verificationMeta = meta.verificationMeta;
    }
    if (meta.assignedWorker) {
      complaint.assignedWorker = meta.assignedWorker;
    }

    list[idx] = complaint;
    saveComplaints(list);
    return complaint;
  },

  assignWorker: async (id, worker, notes = '') => {
    return complaintService.updateStatus(id, COMPLAINT_STATUS.ASSIGNED, {
      assignedWorker: {
        id: worker.id,
        name: worker.name,
        unit: worker.department || worker.ward || 'Rapid Dispatch Team',
        assignedDate: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0]
      },
      progressNote: notes ? `Dispatched to ${worker.name}: ${notes}` : `Dispatched to ${worker.name}`
    });
  },

  submitProgress: async (id, percent, note, author = 'Marcus Chen') => {
    const newStatus = percent > 0 ? COMPLAINT_STATUS.IN_PROGRESS : undefined;
    return complaintService.updateStatus(id, newStatus || COMPLAINT_STATUS.IN_PROGRESS, {
      progressPercent: percent,
      progressNote: note,
      author
    });
  },

  reportBlocker: async (id, blockerReason, author = 'Marcus Chen') => {
    return complaintService.updateStatus(id, COMPLAINT_STATUS.IN_PROGRESS, {
      progressNote: `⚠️ BLOCKER REPORTED: ${blockerReason}`,
      author
    });
  },

  submitEvidence: async (id, evidence) => {
    // Note: Workflow rule #9: Do not mark as resolved automatically. Must be RESOLUTION_SUBMITTED!
    return complaintService.updateStatus(id, COMPLAINT_STATUS.RESOLUTION_SUBMITTED, {
      resolutionEvidence: evidence,
      progressPercent: 100,
      progressNote: 'Work completed. Submitted resolution evidence for municipal officer inspection.'
    });
  },

  verifyResolution: async (id, decision, notes, officerName = 'Elena Vance') => {
    // Note: Workflow rule #9: Only officer approval transitions to RESOLVED
    if (decision === 'APPROVE') {
      return complaintService.updateStatus(id, COMPLAINT_STATUS.RESOLVED, {
        verificationMeta: {
          verifiedBy: officerName,
          officerNotes: notes || 'Verified on-site work and GPS photos. Officially closed.',
          approvedAt: new Date().toISOString()
        },
        progressNote: `Officer Verification Passed (${officerName}): ${notes || 'Approved'}`
      });
    } else if (decision === 'REQUEST_REWORK') {
      return complaintService.updateStatus(id, COMPLAINT_STATUS.REWORK_REQUESTED, {
        progressNote: `⚠️ REWORK REQUESTED by Officer (${officerName}): ${notes}`,
        progressPercent: 75
      });
    } else {
      return complaintService.updateStatus(id, COMPLAINT_STATUS.REJECTED, {
        progressNote: `Resolution rejected by Officer (${officerName}): ${notes}`
      });
    }
  },

  resetToDefaults: () => {
    saveComplaints(INITIAL_COMPLAINTS);
    return [...INITIAL_COMPLAINTS];
  }
};
