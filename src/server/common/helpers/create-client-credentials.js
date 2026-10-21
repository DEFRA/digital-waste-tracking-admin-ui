import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

// Client Sync checks for a duplicate name, creates the client and syncs before
// replying, so several CDP calls. Its create call times out after 10 seconds
// (up to 20 if CDP is slow to send its response), but the others have no
// timeout yet, so a slow CDP can still outlast this and lose the secret
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

  // A parse error would quote part of the body, which holds the secret
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(
      'Client Sync returned client credentials that could not be read'
    )
  }

  const { clientId, clientSecret } = body

  if (!clientId || !clientSecret) {
    throw new Error('Client Sync returned client credentials without a secret')
  }

  return {
    isDuplicate: false,
    credentials: { clientId, clientName, clientSecret }
  }
}
