import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

// Client Sync waits up to 10 seconds for CDP, and can take twice that when
// CDP is slow to send its response
const requestTimeoutMs = 30_000

/**
 * Creates client credentials for the configured service with the DWT Client
 * Sync backend, for the environment the portal is running in.
 *
 * The response holds the client secret, which is only available now, so it's
 * never logged, including when the request fails.
 *
 * @param {String} clientName - The new client's name
 *
 * @returns {Promise<{ isDuplicate: true } | { isDuplicate: false, credentials: { clientId: String, clientName: String, clientSecret: String } }>}
 * The new credentials, or isDuplicate when a client with the name already exists
 */
export async function createClientCredentials(clientName) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}`,
    config.get('services.clientSync')
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: withTraceId(config.get('tracing.header'), {
      'Content-Type': 'application/json',
      Authorization: generateServiceAuthHeader()
    }),
    body: JSON.stringify({ clientName }),
    signal: AbortSignal.timeout(requestTimeoutMs)
  })

  // Client Sync compares names ignoring case
  if (response.status === statusCodes.conflict) {
    return { isDuplicate: true }
  }

  if (!response.ok) {
    throw new Error(
      `Failed to create client credentials: ${response.status} ${response.statusText}`
    )
  }

  const { clientId, clientSecret } = await response.json()

  if (!clientId || !clientSecret) {
    throw new Error('Client Sync returned client credentials without a secret')
  }

  return {
    isDuplicate: false,
    credentials: { clientId, clientName, clientSecret }
  }
}
