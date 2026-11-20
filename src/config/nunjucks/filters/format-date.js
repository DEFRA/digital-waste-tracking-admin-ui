import { format, isDate, parseISO } from 'date-fns'

/**
 * Formats a date, which may be an ISO 8601 string, with date-fns.
 * @param {Date | string} value - The date, or an ISO 8601 string of it
 * @param {string} [formattedDateStr] - The date-fns format, such as "d LLLL yyyy"
 * @returns {string} The date, formatted
 */
export function formatDate(value, formattedDateStr = 'EEE do MMMM yyyy') {
  const date = isDate(value) ? value : parseISO(value)

  return format(date, formattedDateStr)
}
