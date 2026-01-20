/**
 * Normalize order number to consistent format
 * Accepts: "#1001", "1001", "#  1001", "order 1001"
 * Returns: "#1001"
 */
export function normalizeOrderNumber(input: string): string {
  // Remove all non-alphanumeric characters and leading/trailing whitespace
  const cleaned = input.trim().replace(/[^a-zA-Z0-9]/g, '');

  // If it's just numbers, prepend #
  if (/^\d+$/.test(cleaned)) {
    return `#${cleaned}`;
  }

  // If it starts with 'order' (case insensitive), extract the number
  const orderMatch = cleaned.match(/^order(\d+)$/i);
  if (orderMatch) {
    return `#${orderMatch[1]}`;
  }

  // Return as-is with # prepended if not already there
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

/**
 * Extract numeric part of order number
 */
export function getOrderNumberDigits(orderNumber: string): string {
  return orderNumber.replace(/\D/g, '');
}

/**
 * Format order number for display
 */
export function formatOrderNumber(orderNumber: string): string {
  const digits = getOrderNumberDigits(orderNumber);
  return `#${digits}`;
}
