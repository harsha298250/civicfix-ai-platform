/**
 * CivicFix AI — Centralized Backend API Client Adapter
 * 
 * Supports:
 * - Configurable backend base URL (VITE_API_BASE_URL)
 * - Cookie-based session authentication with credentials: 'include'
 * - Automatic CSRF token extraction from XSRF-TOKEN cookie -> X-XSRF-TOKEN header
 * - Unified error handling, JSON serialization, and unauthorized status dispatch
 * - Backward-compatible fallback toggle for seamless Sprint transition
 */

export const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    return '/api';
  }
  return 'http://localhost:8080/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Extracts a cookie value by name from document.cookie
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};

/**
 * Core HTTP Request Wrapper
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  let url;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  } else if (typeof window !== 'undefined' && window.location) {
    url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  } else {
    url = `http://localhost:8080${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  // Mutating requests automatically attach Spring Security X-XSRF-TOKEN header
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include' // Transmit and store CIVICFIX_SESSION and XSRF-TOKEN cookies
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    // Parse JSON response body if present
    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const retryAfter = response.headers ? (response.headers.get('Retry-After') || response.headers.get('retry-after')) : null;
      let errorMessage = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
      if (response.status === 429) {
        const seconds = retryAfter || data?.retryAfterSeconds;
        errorMessage = seconds
          ? `Too many requests. Please wait ${seconds} seconds before trying again.`
          : (data?.message || 'Too many requests. Please slow down and try again shortly.');
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      error.retryAfter = retryAfter ? parseInt(retryAfter, 10) : (data?.retryAfterSeconds || null);
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (
      err.name === 'TypeError' ||
      err.code === 'ECONNREFUSED' ||
      (err.message && (err.message.includes('fetch') || err.message.includes('Failed to parse URL')))
    ) {
      const connErr = new Error(`Cannot connect to CivicFix backend at ${url}. Ensure Spring Boot is running.`);
      connErr.status = 0;
      throw connErr;
    }
    throw err;
  }
}

/**
 * Backend API Client Modules
 */
export const apiClient = {
  // Health
  checkHealth: () => apiRequest('/health'),

  // Auth Endpoints
  auth: {
    register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
    login: (identifier, password) => apiRequest('/auth/login', { method: 'POST', body: { identifier, password } }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
    getCurrentUser: () => apiRequest('/auth/me')
  },

  // Complaint Endpoints
  complaints: {
    create: (payload) => apiRequest('/complaints', { method: 'POST', body: payload }),
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.category) query.append('category', params.category);
      if (params.ward) query.append('ward', params.ward);
      if (params.minLat !== undefined && params.minLat !== null) query.append('minLat', params.minLat);
      if (params.maxLat !== undefined && params.maxLat !== null) query.append('maxLat', params.maxLat);
      if (params.minLng !== undefined && params.minLng !== null) query.append('minLng', params.minLng);
      if (params.maxLng !== undefined && params.maxLng !== null) query.append('maxLng', params.maxLng);
      if (params.page !== undefined) query.append('page', params.page);
      if (params.size !== undefined) query.append('size', params.size);
      const qs = query.toString();
      return apiRequest(`/complaints${qs ? '?' + qs : ''}`);
    },
    getPublicMap: (params = {}) => {
      const query = new URLSearchParams();
      if (params.minLat !== undefined && params.minLat !== null) query.append('minLat', params.minLat);
      if (params.maxLat !== undefined && params.maxLat !== null) query.append('maxLat', params.maxLat);
      if (params.minLng !== undefined && params.minLng !== null) query.append('minLng', params.minLng);
      if (params.maxLng !== undefined && params.maxLng !== null) query.append('maxLng', params.maxLng);
      if (params.status) query.append('status', params.status);
      if (params.category) query.append('category', params.category);
      if (params.ward) query.append('ward', params.ward);
      if (params.limit !== undefined) query.append('limit', params.limit);
      const qs = query.toString();
      return apiRequest(`/complaints/public/map${qs ? '?' + qs : ''}`);
    },
    getById: (id) => apiRequest(`/complaints/${encodeURIComponent(id)}`),
    getHistory: (id) => apiRequest(`/complaints/${encodeURIComponent(id)}/history`),
    assignWorker: (id, workerId, notes) => apiRequest(`/complaints/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      body: { workerId, notes }
    }),
    updateStatus: (id, payload) => apiRequest(`/complaints/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: payload
    }),
    addNote: (id, note) => apiRequest(`/complaints/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      body: { note }
    }),
    submitEvidence: (id, formData) => apiRequest(`/complaints/${encodeURIComponent(id)}/evidence`, {
      method: 'POST',
      body: formData
    }),
    uploadPhotos: (id, formData) => apiRequest(`/complaints/${encodeURIComponent(id)}/photos`, {
      method: 'POST',
      body: formData
    }),
    getEvidence: (id) => apiRequest(`/complaints/${encodeURIComponent(id)}/evidence`),
    adjudicateAiTriage: (id, payload) => apiRequest(`/complaints/${encodeURIComponent(id)}/ai/adjudicate`, {
      method: 'POST',
      body: payload
    }),
    getDuplicates: (id) => apiRequest(`/complaints/${encodeURIComponent(id)}/duplicates`),
    linkDuplicate: (id, payload) => apiRequest(`/complaints/${encodeURIComponent(id)}/duplicates/link`, {
      method: 'POST',
      body: payload
    }),
    escalate: (id, reason) => apiRequest(`/complaints/${encodeURIComponent(id)}/escalate`, {
      method: 'POST',
      body: { reason }
    }),
    confirmResolution: (id, payload = {}) => apiRequest(`/complaints/${encodeURIComponent(id)}/confirm-resolution`, {
      method: 'POST',
      body: payload
    }),
    rejectResolution: (id, payload, photoFile = null) => {
      if (photoFile) {
        const formData = new FormData();
        formData.append('reason', (payload && payload.reason) || '');
        if (payload && payload.version !== undefined && payload.version !== null) {
          formData.append('version', payload.version);
        }
        formData.append('photo', photoFile);
        return apiRequest(`/complaints/${encodeURIComponent(id)}/reject-resolution`, {
          method: 'POST',
          body: formData
        });
      }
      return apiRequest(`/complaints/${encodeURIComponent(id)}/reject-resolution`, {
        method: 'POST',
        body: payload
      });
    },
    getPublicTrustScores: (params = {}) => {
      const query = new URLSearchParams();
      if (params.from) query.append('from', params.from);
      if (params.to) query.append('to', params.to);
      const qs = query.toString();
      return apiRequest(`/complaints/public/trust${qs ? '?' + qs : ''}`);
    }
  },

  // Supervisor Operations (SLA & Escalation Management)
  supervisor: {
    getEscalations: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page !== undefined && params.page !== null) query.append('page', params.page);
      if (params.size !== undefined && params.size !== null) query.append('size', params.size);
      if (params.ward && params.ward !== 'ALL') query.append('ward', params.ward);
      if (params.category && params.category !== 'ALL') query.append('category', params.category);
      const qs = query.toString();
      return apiRequest(`/supervisor/escalations${qs ? '?' + qs : ''}`);
    },
    reassignWorker: (id, payload) => apiRequest(`/supervisor/complaints/${encodeURIComponent(id)}/reassign`, {
      method: 'POST',
      body: payload
    }),
    getWorkers: () => apiRequest('/supervisor/workers')
  },

  // Public Features Endpoint
  features: {
    getFeatures: () => apiRequest('/public/features')
  },

  // GIS Endpoints
  gis: {
    reverseGeocode: (lat, lng) => apiRequest(`/gis/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`)
  },

  // Notification Endpoints (Phase 5)
  notifications: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page !== undefined && params.page !== null) query.append('page', params.page);
      if (params.size !== undefined && params.size !== null) query.append('size', params.size);
      if (params.unreadOnly !== undefined && params.unreadOnly !== null) query.append('unreadOnly', params.unreadOnly);
      const qs = query.toString();
      return apiRequest(`/notifications${qs ? '?' + qs : ''}`);
    },
    getUnreadCount: () => apiRequest('/notifications/unread-count'),
    markAsRead: (id) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
    markAllAsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' })
  },

  // Officer Operations & Analytics Endpoints (Phase 6)
  officer: {
    getAnalyticsSummary: (params = {}) => {
      const query = new URLSearchParams();
      if (params.from) query.append('from', params.from);
      if (params.to) query.append('to', params.to);
      if (params.ward && params.ward !== 'ALL') query.append('ward', params.ward);
      if (params.category && params.category !== 'ALL') query.append('category', params.category);
      const qs = query.toString();
      return apiRequest(`/officer/analytics/summary${qs ? '?' + qs : ''}`);
    },
    getClosureTrustScores: (params = {}) => {
      const query = new URLSearchParams();
      if (params.from) query.append('from', params.from);
      if (params.to) query.append('to', params.to);
      if (params.ward && params.ward !== 'ALL') query.append('ward', params.ward);
      const qs = query.toString();
      return apiRequest(`/officer/analytics/trust${qs ? '?' + qs : ''}`);
    }
  },

  // Admin Endpoints
  admin: {
    getDashboardSummary: () => apiRequest('/admin/dashboard/summary'),
    getUsers: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page !== undefined && params.page !== null) query.append('page', params.page);
      if (params.size !== undefined && params.size !== null) query.append('size', params.size);
      if (params.role && params.role !== 'ALL') query.append('role', params.role);
      if (params.status && params.status !== 'ALL') query.append('status', params.status);
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return apiRequest(`/admin/users${qs ? '?' + qs : ''}`);
    },
    getUserById: (id) => apiRequest(`/admin/users/${encodeURIComponent(id)}`),
    createStaff: (payload) => apiRequest('/admin/users', {
      method: 'POST',
      body: payload
    }),
    updateUserStatus: (id, payload) => apiRequest(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: payload
    }),
    getAuditLogs: (params = {}) => {
      const query = new URLSearchParams();
      if (params.page !== undefined && params.page !== null) query.append('page', params.page);
      if (params.size !== undefined && params.size !== null) query.append('size', params.size);
      if (params.action && params.action !== 'ALL') query.append('action', params.action);
      if (params.actor) query.append('actor', params.actor);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      const qs = query.toString();
      return apiRequest(`/admin/audit-logs${qs ? '?' + qs : ''}`);
    },
    getSlaPolicies: () => apiRequest('/admin/sla-policies'),
    getDemoStatus: () => apiRequest('/admin/demo/status'),
    resetDemoData: () => apiRequest('/admin/demo/reset', { method: 'POST' })
  }
};

export default apiClient;
