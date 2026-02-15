/**
 * Normalize an email address for consistent lookups
 * Lowercases and trims the email
 */
export function normalizeEmail(email: string): string | null {
  const normalized = email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  return normalizeEmail(email) !== null;
}

/**
 * Mask email for display: john.doe@gmail.com -> j***e@gmail.com
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || localPart.length < 2) {
    return email;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const masked = `${firstChar}${'*'.repeat(Math.min(localPart.length - 2, 5))}${lastChar}@${domain}`;
  return masked;
}
