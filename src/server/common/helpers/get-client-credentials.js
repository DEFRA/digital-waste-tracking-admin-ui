import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

/**
 * Gets the client credentials for the configured service from the DWT Client
 * Sync backend, for the environment the portal is running in.
 *
 * @returns {Promise<[{ clientId: String, clientName: String, tenantServiceName: String }]>} The client credentials
 */
export async function getClientCredentials() {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}`,
    config.get('services.clientSync')
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: withTraceId(config.get('tracing.header'), {
      'Content-Type': 'application/json',
      Authorization: generateServiceAuthHeader()
    })
  })

  // Client Sync answers 404 when the service has no client credentials
  if (response.status === statusCodes.notFound) {
    return []
  }

  if (!response.ok) {
    throw new Error(
      `Failed to get client credentials: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
