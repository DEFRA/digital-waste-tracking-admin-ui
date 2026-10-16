// The date and time in the UK, whatever time zone the server is in
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})

/**
 * Formats when credentials were generated, for example "15 October 2026 at
 * 4:49pm".
 *
 * @param {Date} date - The date and time
 *
 * @returns {String} The formatted date and time
 */
export function formatGeneratedOn(date) {
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(date).map(({ type, value }) => [type, value])
  )

  return `${parts.day} ${parts.month} ${parts.year} at ${parts.hour}:${parts.minute}${parts.dayPeriod.toLowerCase()}`
}
