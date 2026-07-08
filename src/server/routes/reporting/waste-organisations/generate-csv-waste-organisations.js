import { UTCDate } from '@date-fns/utc'
import { format } from 'date-fns'
import { stringify as generateCsv } from 'csv-stringify/sync'

/**
 * Generates CSV data for the given Waste Organisations.
 *
 * @param {Object} wasteOrganisations - The Waste Organisations
 *
 * @returns {String} The CSV data
 */
export function generateCsvWasteOrganisations(wasteOrganisations) {
  const formattedWasteOrganisations = wasteOrganisations.map(
    ({ organisationId, dateRegistered, activeApiCodeCount }) => {
      return {
        organisationId,
        dateRegistered: format(
          new UTCDate(dateRegistered),
          'dd LLL yyyy, HH:mm'
        ),
        activeApiCodeCount
      }
    }
  )
  const csv = generateCsv(formattedWasteOrganisations, {
    bom: true,
    escape_formulas: true,
    header: true,
    columns: [
      { key: 'organisationId', header: 'Organisation ID' },
      { key: 'dateRegistered', header: 'Registered' },
      { key: 'activeApiCodeCount', header: 'Active API Codes' }
    ]
  })

  return csv
}
