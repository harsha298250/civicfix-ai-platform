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
      const errorMessage = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
      const error = new Error(errorMessage);
      error.status = response.status;
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
      if (params.page !== undefined) query.append('page', params.page);
      if (params.size !== undefined) query.append('size', params.size);
      const qs = query.toString();
      return apiRequest(`/complaints${qs ? '?' + qs : ''}`);
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
    })
  }
};

export default apiClient;
