// okpage/utils/index.ts
import { format } from 'date-fns';
// Example for specific locale import if needed:
// import { enUS, zhCN } from 'date-fns/locale';

export function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats a timestamp into a human-readable string.
 * @param timestamp The timestamp number (milliseconds since epoch).
 * @param formatString The desired format string (defaults to 'PPpp' - e.g., Jul 20, 2024, 2:30:00 PM).
 *                     See date-fns documentation for format options: https://date-fns.org/v3/docs/format
 * @param locale Optional date-fns locale object.
 * @returns A formatted date string, or an empty string if timestamp is invalid.
 */
export function formatTimestamp(
  timestamp: number | Date,
  formatString: string = 'PPpp'
  // locale?: Locale // Locale type would need to be imported from date-fns if used
): string {
  if (!timestamp) return '';
  try {
    // Ensure timestamp is a Date object or number before formatting
    const dateToFormat = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
    // Example of using a specific locale if passed:
    // return format(dateToFormat, formatString, { locale: locale || enUS });
    return format(dateToFormat, formatString);
  } catch (error) {
    console.error('Error formatting timestamp:', timestamp, error);
    // Fallback to basic toLocaleString if date-fns format fails for some reason
    return new Date(timestamp).toLocaleString();
  }
}

// Remove the commented-out flawed escapeHtml function as per subtask instructions.
/*
export function escapeHtml(unsafe: string): string {
  // ... (flawed implementation was here) ...
}
*/
