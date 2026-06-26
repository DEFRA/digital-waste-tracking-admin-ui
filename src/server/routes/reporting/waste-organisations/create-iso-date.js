import { parseISO } from 'date-fns'

export function createIsoDate(
  day,
  month,
  year,
  hours = '00',
  minutes = '00',
  seconds = '00'
) {
  return parseISO(
    `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:${seconds}.000Z`
  )
}
