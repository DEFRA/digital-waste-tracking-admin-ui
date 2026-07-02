import { isValid, parseISO } from 'date-fns'

/**
 * Creates an ISO Date from separate date/time parts.
 *
 * Can handle month and day fields with both one and two digit values and
 * returns undefined for an invalid date, which doesn't throw an error when
 * formatting the date in the template.
 *
 * @param {String} day - The day
 * @param {String} month - The month
 * @param {String} year - The year
 * @param {String} hours - The hours
 * @param {String} minutes - The minutes
 * @param {String} seconds - The seconds
 *
 * @returns {Date | undefined} The ISO Date when successful, otherwise undefined
 */
export function createIsoDate(
  day,
  month,
  year,
  hours = '00',
  minutes = '00',
  seconds = '00'
) {
  let isoDate

  if (day && month && year) {
    isoDate = parseISO(
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:${seconds}.000Z`
    )
  }

  return isValid(isoDate) ? isoDate : undefined
}
