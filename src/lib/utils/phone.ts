/**
 * Normalize a phone number to E.164 format
 * Accepts various formats: (555) 123-4567, 555-123-4567, 5551234567, +15551234567
 * Returns E.164 format: +15551234567
 */
export function normalizePhone(phone: string): string | null {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Check for valid US phone number (10 digits, or 11 starting with 1)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If starts with + and has the right format
  if (phone.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Validate a phone number
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

/**
 * Format phone number for display (mask middle digits)
 * +15551234567 -> (***) ***-4567
 */
export function maskPhone(phone: string): string {
  // Keep last 4 digits visible
  const lastFour = phone.slice(-4);
  const prefix = phone.slice(0, -4).replace(/\d/g, '*');
  return prefix + lastFour;
}
