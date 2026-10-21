/**
 * Indian Phone Number & Contact Normalization Utilities
 * Supports Indian Telecom Standards: +91 country code, 10-digit mobile numbers starting with 6, 7, 8, or 9.
 */

/**
 * Strips all non-digit characters from string.
 */
export const extractDigits = (val) => {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
};

/**
 * Normalizes an Indian phone number into canonical E.164 format: +91XXXXXXXXXX
 * Handles:
 * - 10 digits: "9876543210" -> "+919876543210"
 * - With leading 0: "09876543210" -> "+919876543210"
 * - With country code: "+91 98765 43210" -> "+919876543210"
 * - With 91 prefix without plus: "919876543210" -> "+919876543210"
 */
export const normalizeIndianPhone = (phone) => {
  if (!phone) return '';
  let digits = extractDigits(phone);

  // If starts with 91 and has 12 digits, strip country code
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  // If starts with 0 and has 11 digits, strip leading zero
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Check if exactly 10 digits
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return phone.trim();
};

/**
 * Validates whether the given string is a valid Indian mobile number.
 * Standard Indian mobile numbers:
 * - 10 digits long
 * - Must begin with 6, 7, 8, or 9
 */
export const isValidIndianPhone = (phone) => {
  if (!phone) return false;
  let digits = extractDigits(phone);

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
};

/**
 * Formats a phone number for user-friendly Indian display: "+91 98765 43210"
 */
export const formatIndianPhone = (phone) => {
  if (!phone) return '';
  let digits = extractDigits(phone);

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }

  // Partial formatting for live typing
  if (digits.length > 5 && digits.length <= 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
  }
  if (digits.length > 0 && digits.length <= 5) {
    return `+91 ${digits}`;
  }

  return phone;
};

/**
 * Normalizes email address (lowercased, trimmed).
 */
export const normalizeEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Detects whether an identifier is an email or phone number.
 */
export const detectContactType = (identifier) => {
  if (!identifier) return 'UNKNOWN';
  if (identifier.includes('@')) return 'EMAIL';
  const digits = extractDigits(identifier);
  if (digits.length >= 10) return 'PHONE';
  return 'UNKNOWN';
};

/**
 * Canonicalizes any contact identifier (email or Indian phone) for unique database lookup.
 */
export const canonicalizeContact = (identifier) => {
  if (!identifier) return '';
  const type = detectContactType(identifier);
  if (type === 'EMAIL') {
    return normalizeEmail(identifier);
  }
  if (type === 'PHONE') {
    return normalizeIndianPhone(identifier);
  }
  return identifier.trim().toLowerCase();
};
