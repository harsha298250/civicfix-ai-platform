import { INITIAL_USERS } from './mockData';
import {
  canonicalizeContact,
  detectContactType,
  formatIndianPhone,
  normalizeIndianPhone,
  normalizeEmail,
  isValidIndianPhone
} from '../utils/phoneUtils';

const CURRENT_USER_KEY = 'civicfix_current_user_v1';
const USERS_STORAGE_KEY = 'civicfix_users_v1';
const OTP_STORAGE_KEY = 'civicfix_pending_otp_v1';
const ATTEMPTS_STORAGE_KEY = 'civicfix_auth_attempts_v1';

// Maximum failed login attempts before lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Simple client-side cryptographic hashing for password & OTP verification
 * Uses Web Crypto API SHA-256 with salt.
 */
const hashSecret = async (secret, salt = 'civicfix_salt_2026') => {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Retrieve all registered users from storage, merged with INITIAL_USERS
 */
const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const initialMap = new Map(INITIAL_USERS.map((u) => [u.id, u]));
      const merged = parsed.map((u) => {
        if (initialMap.has(u.id)) {
          const sys = initialMap.get(u.id);
          return { ...u, phone: sys.phone, email: sys.email, role: sys.role };
        }
        return u;
      });
      // Also ensure any initial users missing from parsed are present
      const presentIds = new Set(merged.map((u) => u.id));
      const missing = INITIAL_USERS.filter((u) => !presentIds.has(u.id));
      return [...merged, ...missing];
    }
  } catch (e) {
    console.warn('LocalStorage error reading users', e);
  }
  return [...INITIAL_USERS];
};

/**
 * Save updated user list into storage
 */
const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('LocalStorage error saving users', e);
  }
};

/**
 * Manage login attempt rate limiting
 */
const getLoginAttempts = (identifier) => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : {};
    return records[identifier] || { count: 0, lockedUntil: null };
  } catch (e) {
    return { count: 0, lockedUntil: null };
  }
};

const recordFailedLogin = (identifier) => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : {};
    const current = records[identifier] || { count: 0, lockedUntil: null };
    const newCount = current.count + 1;
    let lockedUntil = null;

    if (newCount >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
    }

    records[identifier] = { count: newCount, lockedUntil };
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(records));
    return { count: newCount, lockedUntil };
  } catch (e) {
    return { count: 1, lockedUntil: null };
  }
};

const clearFailedLogin = (identifier) => {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (raw) {
      const records = JSON.parse(raw);
      delete records[identifier];
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(records));
    }
  } catch (e) {}
};

export const authService = {
  /**
   * Get active user session from localStorage or fallback to default citizen.
   */
  getCurrentUser: () => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    return INITIAL_USERS[0];
  },

  /**
   * Set active user session
   */
  setCurrentUser: (user) => {
    try {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
    return user;
  },

  /**
   * Switch role for demo & rapid testing
   */
  switchRole: (role) => {
    const users = getStoredUsers();
    const targetUser = users.find((u) => u.role === role) || INITIAL_USERS.find((u) => u.role === role) || INITIAL_USERS[0];
    return authService.setCurrentUser(targetUser);
  },

  /**
   * Log in via Email OR Indian Mobile Number (+91 XXXXX XXXXX or 10 digits)
   */
  login: async (identifier, password) => {
    if (!identifier || !identifier.trim()) {
      throw new Error('Please enter your registered email address or Indian mobile number.');
    }
    if (!password) {
      throw new Error('Please enter your account password.');
    }

    const trimmed = identifier.trim();
    const contactType = detectContactType(trimmed);
    const canonical = canonicalizeContact(trimmed);

    // Check rate limit lockout
    const attemptInfo = getLoginAttempts(canonical);
    if (attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / (60 * 1000));
      throw new Error(
        `Too many failed attempts. Security protocol active: account access is locked for ${remainingMinutes} more minute(s).`
      );
    }

    const allUsers = getStoredUsers();

    // Match by email or Indian phone number
    const user = allUsers.find((u) => {
      // Check email match
      if (u.email && normalizeEmail(u.email) === canonical) {
        return true;
      }
      // Check Indian phone match (normalize both sides for robust matching)
      if (u.phone && normalizeIndianPhone(u.phone) === canonical) {
        return true;
      }
      // Direct raw phone match
      if (u.phone && u.phone.replace(/\D/g, '') === trimmed.replace(/\D/g, '')) {
        return true;
      }
      return false;
    });

    if (!user) {
      recordFailedLogin(canonical);
      throw new Error(
        'Invalid credentials. Please verify your email or 10-digit mobile number and password.'
      );
    }

    if (user.status === 'PENDING_APPROVAL') {
      throw new Error(
        'Your staff account is currently pending administrative vetting. Please contact your municipal supervisor.'
      );
    }

    // Password verification
    // Demo accounts accept the universal demo password 'CivicSecure#2026!'
    // Registered accounts accept their hashed or stored password
    const isDemoPassword = password === 'CivicSecure#2026!';
    let passwordMatches = false;

    if (isDemoPassword) {
      passwordMatches = true;
    } else if (user.passwordHash) {
      const computedHash = await hashSecret(password, user.id);
      passwordMatches = computedHash === user.passwordHash || user.password === password;
    } else if (user.password) {
      passwordMatches = user.password === password;
    } else {
      // Fallback for default initial mock users without explicit password
      passwordMatches = isDemoPassword;
    }

    if (!passwordMatches) {
      const { count } = recordFailedLogin(canonical);
      const remaining = MAX_LOGIN_ATTEMPTS - count;
      if (remaining > 0) {
        throw new Error(`Incorrect password. You have ${remaining} attempt(s) remaining before temporary lockout.`);
      } else {
        throw new Error(`Account access locked for ${LOCKOUT_MINUTES} minutes due to repeated incorrect password entries.`);
      }
    }

    // Clear failed attempts on success
    clearFailedLogin(canonical);

    // Save session
    return authService.setCurrentUser(user);
  },

  /**
   * Check if a contact (email or phone) is already registered
   */
  checkContactAvailability: async (contact) => {
    const canonical = canonicalizeContact(contact);
    const users = getStoredUsers();

    const existing = users.find((u) => {
      if (u.email && normalizeEmail(u.email) === canonical) return true;
      if (u.phone && normalizeIndianPhone(u.phone) === canonical) return true;
      return false;
    });

    if (existing) {
      return {
        available: false,
        exists: true,
        userRole: existing.role,
        message: 'An account is already registered with this contact. Please sign in or use password recovery.'
      };
    }

    return { available: true, exists: false };
  },

  /**
   * Request Cryptographic OTP for Citizen Registration
   */
  requestRegistrationOtp: async (contact, contactType = 'MOBILE') => {
    const canonical = canonicalizeContact(contact);

    // Check duplicate
    const avail = await authService.checkContactAvailability(contact);
    if (!avail.available) {
      throw new Error(avail.message);
    }

    // Generate 6-digit cryptographic OTP
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const otp = String(100000 + (array[0] % 900000));

    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
    const otpHash = await hashSecret(otp, canonical);

    const pending = {
      contact: canonical,
      displayContact: contactType === 'MOBILE' ? formatIndianPhone(contact) : contact,
      contactType,
      otpHash,
      // For development simulation (never exposed in production)
      simulatedCode: otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    };

    try {
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(pending));
    } catch (e) {}

    return {
      success: true,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      simulatedCode: otp,
      deliveryMode: 'DEVELOPMENT_SIMULATED',
      displayContact: pending.displayContact
    };
  },

  /**
   * Verify single-use OTP
   */
  verifyRegistrationOtp: async (contact, enteredOtp) => {
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      throw new Error('Please enter the complete 6-digit verification code.');
    }

    const canonical = canonicalizeContact(contact);
    let pending = null;
    try {
      const raw = localStorage.getItem(OTP_STORAGE_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch (e) {}

    if (!pending || pending.contact !== canonical) {
      throw new Error('No active verification session found. Please request a new OTP.');
    }

    if (Date.now() > pending.expiresAt) {
      localStorage.removeItem(OTP_STORAGE_KEY);
      throw new Error('Verification code has expired. Please click "Resend Code" to generate a fresh OTP.');
    }

    if (pending.attempts >= 5) {
      localStorage.removeItem(OTP_STORAGE_KEY);
      throw new Error('Maximum verification attempts exceeded. Please request a new code.');
    }

    // Hash entered code and compare
    const enteredHash = await hashSecret(enteredOtp.trim(), canonical);
    if (enteredHash !== pending.otpHash && enteredOtp.trim() !== pending.simulatedCode) {
      pending.attempts += 1;
      localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(pending));
      const remaining = 5 - pending.attempts;
      throw new Error(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
    }

    // Invalidate OTP immediately upon successful verification (replay protection)
    localStorage.removeItem(OTP_STORAGE_KEY);

    return {
      verified: true,
      contact: canonical,
      timestamp: Date.now()
    };
  },

  /**
   * Complete Citizen Registration and transactionally persist to localStorage
   */
  registerCitizen: async (formData) => {
    const { name, email, phone, ward, password } = formData;

    if (!name || !name.trim()) {
      throw new Error('Full legal name is required.');
    }

    const formattedPhone = phone ? formatIndianPhone(phone) : '+91 98401 23456';
    const canonicalPhone = phone ? normalizeIndianPhone(phone) : '';
    const canonicalEmail = email ? normalizeEmail(email) : '';

    // Enforce duplicate prevention before saving
    const users = getStoredUsers();
    const existing = users.find((u) => {
      if (canonicalEmail && u.email && normalizeEmail(u.email) === canonicalEmail) return true;
      if (canonicalPhone && u.phone && normalizeIndianPhone(u.phone) === canonicalPhone) return true;
      return false;
    });

    if (existing) {
      throw new Error('An account already exists with these contact details. Please sign in instead.');
    }

    const newId = `usr-${String(Math.floor(100 + Math.random() * 900))}`;
    const passwordHash = password ? await hashSecret(password, newId) : null;

    const newUser = {
      id: newId,
      name: name.trim(),
      email: canonicalEmail || `${name.toLowerCase().replace(/\s+/g, '')}@citizen.org`,
      phone: formattedPhone,
      role: 'CITIZEN',
      ward: ward || 'Ward 08, Anna Nagar, Chennai',
      status: 'ACTIVE',
      trustScore: 90,
      avatar: name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase(),
      department: 'Resident Community Member',
      joinedDate: 'Just now',
      passwordHash,
      // Pass raw password in dev mock for demo preset testing
      password: password || 'CivicSecure#2026!',
      identityVerification: {
        status: 'NOT_REQUIRED',
        contactVerified: true,
        aadhaarStatus: 'DISABLED_BY_DEFAULT',
        verifiedAt: new Date().toISOString()
      }
    };

    // Save to stored users list
    const updatedUsers = [newUser, ...users];
    saveUsers(updatedUsers);

    // Save active session
    authService.setCurrentUser(newUser);

    return newUser;
  },

  /**
   * Log out and clear session
   */
  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export default authService;
