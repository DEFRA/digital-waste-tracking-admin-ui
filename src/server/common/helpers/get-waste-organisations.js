import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'

const getOrganisationsPath = '/organisations'

/**
 * Generates a Basic auth header for authenticating with internal backend
 * services from the configured service credentials.
 *
 * @returns {String} The Basic auth header value
 */
function generateAuthHeader() {
  const username = config.get('serviceAuth.username')
  const password = config.get('serviceAuth.password')

  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

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
      Authorization: generateAuthHeader()
    })
  })

  if (!response.ok) {
    throw new Error(
      `Failed to get waste organisations: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
