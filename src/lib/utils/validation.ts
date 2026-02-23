const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

export function validateMaxLength(value: string, max: number, fieldName: string): string | null {
  if (value.length > max) {
    return `${fieldName} exceeds maximum length of ${max} characters`;
  }
  return null;
}

export function validateEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  fieldName: string
): string | null {
  if (!allowed.includes(value as T)) {
    return `Invalid ${fieldName}. Must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function escapePostgrestValue(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/\./g, '\\.')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export const LIMITS = {
  CUSTOMER_NAME: 200,
  CUSTOMER_EMAIL: 254,
  CUSTOMER_PHONE: 20,
  ITEMS_DESCRIPTION: 2000,
  ORDER_NUMBER: 100,
  MESSAGE_CONTENT: 1000,
  NOTIFICATION_BODY: 5000,
  ADMIN_NOTES: 2000,
  SEARCH_QUERY: 200,
  CAPTION: 500,
  CSV_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  BULK_OPERATION_MAX: 100,
} as const;
