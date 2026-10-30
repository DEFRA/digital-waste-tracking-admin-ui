import { UTCDate } from '@date-fns/utc'
import { format } from 'date-fns'
import { stringify as generateCsv } from 'csv-stringify/sync'

import { localAuthorityText } from './local-authority.js'

/**
 * Generates CSV data for the given Waste Organisations.
 *
 * @param {Object} wasteOrganisations - The Waste Organisations
 *
 * @returns {String} The CSV data
 */
export function generateCsvWasteOrganisations(wasteOrganisations) {
  const formattedWasteOrganisations = wasteOrganisations.map(
    ({
      organisationId,
      name,
      activeApiCodeCount,
      dateRegistered,
      isLocalAuthority
    }) => ({
      name,
      organisationId,
      activeApiCodeCount,
      dateRegistered: format(new UTCDate(dateRegistered), 'dd LLL yyyy, HH:mm'),
      localAuthority: localAuthorityText(isLocalAuthority)
    })
  )

  // The columns follow the table's, with the name and ID apart
  return generateCsv(formattedWasteOrganisations, {
    bom: true,
    escape_formulas: true,
    header: true,
    columns: [
      { key: 'name', header: 'Organisation name' },
      { key: 'organisationId', header: 'Organisation ID' },
      { key: 'activeApiCodeCount', header: 'Active API codes' },
      { key: 'dateRegistered', header: 'Registered (UTC)' },
      { key: 'localAuthority', header: 'Local authority' }
    ]
  })
}
