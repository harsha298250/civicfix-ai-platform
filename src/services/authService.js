import { INITIAL_USERS } from './mockData.js';
import { apiClient } from './apiClient.js';
import {
  formatIndianPhone,
  normalizeIndianPhone,
  normalizeEmail
} from '../utils/phoneUtils.js';

// In-memory active session user state (no persistent credentials or sessions stored in localStorage)
let activeSessionUser = null;

/**
 * Helper to check whether demo mode is actively enabled via environment variable
 */
export const isDemoModeEnabled = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEMO_MODE) {
    return import.meta.env.VITE_DEMO_MODE === 'true';
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_DEMO_MODE) {
    return process.env.VITE_DEMO_MODE === 'true';
  }
  return false;
};

export const authService = {
  /**
   * Get active user session in memory or return null if unauthenticated.
   */
  getCurrentUser: () => {
    return activeSessionUser;
  },

  /**
   * Set active user session (or clear if null)
   */
  setCurrentUser: (user) => {
    activeSessionUser = user || null;
    return activeSessionUser;
  },

  /**
   * Terminate active user session
   */
  logout: async () => {
    activeSessionUser = null;
    try {
      localStorage.removeItem('civicfix_current_user_v1');
    } catch (e) {}
    try {
      await apiClient.auth.logout();
    } catch (e) {
      // Backend may be offline or unreachable, ignore network failure on logout
    }
  },

  /**
   * Check active server session via GET /api/auth/me
   */
  checkSession: async () => {
    try {
      const res = await apiClient.auth.getCurrentUser();
      const backendUser = res?.data || res;
      if (backendUser && backendUser.id) {
        const liveUser = {
          id: String(backendUser.id),
          name: backendUser.name || 'Citizen User',
          email: backendUser.email || '',
          phone: backendUser.phone || '',
          role: backendUser.role || 'CITIZEN',
          roles: backendUser.roles || [backendUser.role || 'CITIZEN'],
          department: backendUser.department || '',
          ward: backendUser.ward || 'Ward 08, Anna Nagar, Chennai',
          trustScore: backendUser.trustScore ?? 90,
          status: backendUser.accountStatus || 'ACTIVE',
          isLiveBackend: true,
          authSource: 'POSTGRESQL_BACKEND'
        };
        authService.setCurrentUser(liveUser);
        return liveUser;
      }
      authService.setCurrentUser(null);
      return null;
    } catch (err) {
      authService.setCurrentUser(null);
      if (err.status === 401 || err.status === 403) {
        return null;
      }
      const unreachableError = new Error('Cannot reach the server. Nothing was saved.');
      unreachableError.isServerUnreachable = true;
      unreachableError.status = err.status || 0;
      throw unreachableError;
    }
  },

  /**
   * Switch role for demo & rapid testing (explicitly non-authoritative client persona switch).
   * Gated strictly behind VITE_DEMO_MODE === 'true'.
   */
  switchRole: (role) => {
    if (!isDemoModeEnabled()) {
      throw new Error('Demo mode is disabled. Role switching is not permitted.');
    }
    const targetUser = INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    const demoPersona = {
      ...targetUser,
      isLiveBackend: false,
      isDemoMode: true,
      authSource: 'DEMO_PERSONA_SWITCH'
    };
    return authService.setCurrentUser(demoPersona);
  },

  /**
   * Log in via Email OR Indian Mobile Number (+91 XXXXX XXXXX or 10 digits)
   * Connects to Spring Boot POST /api/auth/login backed by PostgreSQL
   */
  login: async (identifier, password) => {
    if (!identifier || !identifier.trim()) {
      throw new Error('Please enter your registered email address or Indian mobile number.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    const trimmed = identifier.trim();

    try {
      const response = await apiClient.auth.login(trimmed, password);
      const backendUser = response?.data || response;

      const legacyIdMap = {
        '00000000-0000-0000-0000-000000000001': 'usr-001',
        '00000000-0000-0000-0000-000000000002': 'usr-002',
        '00000000-0000-0000-0000-000000000003': 'usr-003',
        '00000000-0000-0000-0000-000000000004': 'usr-004'
      };

      const user = {
        id: legacyIdMap[String(backendUser.id)] || String(backendUser.id),
        backendId: String(backendUser.id),
        name: backendUser.name || 'Citizen User',
        email: backendUser.email || trimmed,
        phone: backendUser.phone || '',
        role: backendUser.role || 'CITIZEN',
        roles: backendUser.roles || [backendUser.role || 'CITIZEN'],
        department: backendUser.department || '',
        ward: backendUser.ward || 'Ward 08, Anna Nagar, Chennai',
        trustScore: backendUser.trustScore ?? 90,
        status: backendUser.accountStatus || 'ACTIVE',
        isLiveBackend: true,
        authSource: 'POSTGRESQL_BACKEND'
      };

      authService.setCurrentUser(user);
      return user;
    } catch (apiError) {
      if (apiError.status === 401 || apiError.status === 403 || apiError.status === 400 || apiError.status === 429) {
        const errorMsg = apiError.data?.message || apiError.message || 'Invalid credentials. Please verify your email or mobile number and password.';
        throw new Error(errorMsg);
      }

      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  },

  /**
   * Complete Citizen Registration against Spring Boot PostgreSQL Backend
   */
  registerCitizen: async (formData) => {
    const { name, email, phone, ward, password } = formData;

    if (!name || !name.trim()) {
      throw new Error('Full legal name is required.');
    }

    const formattedPhone = phone ? formatIndianPhone(phone) : '';
    const canonicalPhone = phone ? normalizeIndianPhone(phone) : '';
    const canonicalEmail = email ? normalizeEmail(email) : '';

    try {
      const res = await apiClient.auth.register({
        name: name.trim(),
        email: canonicalEmail || null,
        phone: formattedPhone || null,
        ward: ward || 'Ward 08, Anna Nagar, Chennai',
        password: password || 'CivicSecure#2026!'
      });

      const backendUser = res?.data || res;
      const user = {
        id: backendUser.id ? String(backendUser.id) : 'usr-backend',
        name: backendUser.name || name.trim(),
        email: backendUser.email || canonicalEmail,
        phone: backendUser.phone || formattedPhone,
        role: 'CITIZEN',
        roles: ['CITIZEN'],
        department: backendUser.department || 'Resident Community Member',
        ward: backendUser.ward || ward || 'Ward 08, Anna Nagar, Chennai',
        trustScore: backendUser.trustScore ?? 90,
        status: backendUser.accountStatus || 'ACTIVE',
        avatar: name
          .trim()
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase(),
        isLiveBackend: true,
        authSource: 'POSTGRESQL_BACKEND'
      };

      authService.setCurrentUser(user);
      return user;
    } catch (apiError) {
      if (apiError.status === 400 || apiError.status === 409) {
        throw new Error(apiError.data?.message || apiError.message || 'Registration rejected by server.');
      }
      throw new Error('Cannot reach the server. Nothing was saved.');
    }
  }
};

export default authService;
