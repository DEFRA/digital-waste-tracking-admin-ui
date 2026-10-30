import { UTCDate } from '@date-fns/utc'
import { format, isAfter, isValid } from 'date-fns'

const parts = ['Day', 'Month', 'Year']

const ukDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
})

const formats = {
  Day: /^\d{1,2}$/,
  Month: /^\d{1,2}$/,
  Year: /^\d{4}$/
}

/**
 * @typedef {object} DateError
 * @property {String} text - The message
 * @property {('Day' | 'Month' | 'Year')[]} parts - The inputs to show as wrong
 */

/**
 * Reads one date from its Day, Month and Year inputs, following the GOV.UK
 * dates pattern: the first error in this order applies.
 *
 * @param {Object} query - The search's query parameters
 * @param {String} id - The date's id, such as "date-from"
 * @param {String} name - The date's name in messages, such as "From"
 * @param {Date} today - Today's date in the UK, as the start of that day (UTC)
 *
 * @returns {{ date: Date } | { error: DateError }}
 */
function readDate(query, id, name, today) {
  // A repeated parameter arrives as an array, which is in the wrong format
  const values = Object.fromEntries(
    parts.map((part) => {
      const value = query[`${id}-${part}`] ?? ''
      return [part, typeof value === 'string' ? value.trim() : null]
    })
  )
  const missing = parts.filter((part) => values[part] === '')

  if (missing.length === parts.length) {
    return { error: { text: `Enter a ‘${name}’ date`, parts } }
  }

  if (missing.length === 1) {
    const [part] = missing
    return {
      error: {
        text: `‘${name}’ date must include a ${part.toLowerCase()}`,
        parts: missing
      }
    }
  }

  if (missing.length > 1) {
    return {
      error: {
        text: `‘${name}’ date must include a day, month and year`,
        parts
      }
    }
  }

  const wrongFormat = parts.filter(
    (part) => values[part] === null || !formats[part].test(values[part])
  )

  if (wrongFormat.length > 0) {
    return {
      error: {
        text: `Enter the ‘${name}’ date in the correct format`,
        parts: wrongFormat
      }
    }
  }

  const [day, month, year] = parts.map((part) => Number(values[part]))
  const date = new Date(Date.UTC(year, month - 1, day))

  // Date.UTC rolls 31 February over into March, so check nothing moved
  if (
    !isValid(date) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: { text: `‘${name}’ date must be a real date`, parts } }
  }

  if (isAfter(date, today)) {
    return {
      error: { text: `‘${name}’ date must be today or in the past`, parts }
    }
  }

  return { date }
}

/**
 * Reads the registration date range a search asks for.
 *
 * @param {Object} query - The search's query parameters
 * @param {Date} [now] - The current time
 *
 * @returns {{ dateFrom?: Date, dateTo?: Date, errors?: Object<String, DateError> }}
 * The dates, or the errors by date id ("date-from" and "date-to"), From first
 */
export function readRegistrationDates(query, now = new Date()) {
  // Staff are in the UK, so "today" is the UK's date, which is a day ahead of
  // UTC's for the first hour of each day in summer time
  const { year, month, day } = Object.fromEntries(
    ukDateFormat.formatToParts(now).map(({ type, value }) => [type, value])
  )
  const today = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const from = readDate(query, 'date-from', 'From', today)
  const to = readDate(query, 'date-to', 'To', today)

  const errors = {
    ...(from.error && { 'date-from': from.error }),
    ...(to.error && { 'date-to': to.error })
  }

  // Only when the To date has no other error
  if (from.date && to.date && isAfter(from.date, to.date)) {
    errors['date-to'] = {
      text: `‘To’ date must be the same as or after ${format(new UTCDate(from.date), 'd MMMM yyyy')}`,
      parts
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return { dateFrom: from.date, dateTo: to.date }
}
