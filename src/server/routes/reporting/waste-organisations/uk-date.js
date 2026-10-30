const ukDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
})

/**
 * @param {Date | String} date - A moment in time
 *
 * @returns {Date} The date it falls on in the UK, as midnight UTC of that date,
 * so it can be compared with a date entered on the page and formatted in UTC
 */
export function ukDateOf(date) {
  const { year, month, day } = Object.fromEntries(
    ukDateFormat
      .formatToParts(new Date(date))
      .map(({ type, value }) => [type, value])
  )

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}
