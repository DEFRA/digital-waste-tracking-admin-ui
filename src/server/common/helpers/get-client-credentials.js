import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const logger = createLogger()

// Long enough for a slow response, short enough not to leave the page hanging
const requestTimeoutMs = 10_000

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
    }),
    signal: AbortSignal.timeout(requestTimeoutMs)
  })

  // Client Sync answers 404 when the service has no client credentials. A
  // wrong service name or URL also gives a 404, so log it to make that visible
  if (response.status === statusCodes.notFound) {
    logger.warn(
      `No client credentials found for ${tenantServiceName} at ${url}, showing none`
    )
    return []
  }

  if (!response.ok) {
    throw new Error(
      `Failed to get client credentials: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
