import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

const getOrganisationsPath = '/organisations'

/**
 * Gets Waste Organisations where the DefraID registration date is between a
 * from and to date, from the Waste Organisation backend.
 *
 * @param {Date} dateFrom - The date from
 * @param {Date} dateTo - The date to
 *
 * @returns {Promise<[{ organisationId: String, dateRegistered: String, activeApiCodeCount: Number }]>} The Waste Organisations
 */
export async function getWasteOrganisationsByDate(dateFrom, dateTo) {
  const url = new URL(
    getOrganisationsPath,
    config.get('services.wasteOrganisation')
  )
  url.searchParams.set('startDate', dateFrom.toISOString())
  url.searchParams.set('endDate', dateTo.toISOString())

  const response = await fetch(url, {
    method: 'GET',
    headers: withTraceId(config.get('tracing.header'), {
      'Content-Type': 'application/json',
      Authorization: generateServiceAuthHeader()
    })
  })

  if (!response.ok) {
    throw new Error(
      `Failed to get waste organisations: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
