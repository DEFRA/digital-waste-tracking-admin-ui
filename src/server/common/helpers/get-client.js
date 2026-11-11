import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

// Long enough for a slow response, short enough not to leave the page hanging
const requestTimeoutMs = 10_000

/**
 * Gets one client of the configured service from the DWT Client Sync backend,
 * for the environment the portal is running in.
 *
 * @param {String} clientId
 *
 * @returns {Promise<{ clientId: String, clientName: String, secrets?: Object[] } | undefined>}
 * The client and its secrets, or undefined if they can't be fetched
 */
export async function getClient(clientId) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}/${encodeURIComponent(clientId)}`,
    config.get('services.clientSync')
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: withTraceId(config.get('tracing.header'), {
      'Content-Type': 'application/json',
      Authorization: generateServiceAuthHeader()
    }),
    signal: AbortSignal.timeout(requestTimeoutMs)
  })

  if (response.status === statusCodes.notFound) {
    return undefined
  }

  if (!response.ok) {
    throw new Error(
      `Failed to get client ${clientId}: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
