import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'

// Client Sync checks for a duplicate name, asks CDP to create the client and
// saves it before replying. It allows CDP up to 120 seconds for each call, as
// CDP's docs advise, so a slow CDP can outlast this and lose the secret
const requestTimeoutMs = 30_000

const outcomes = new Set(['success', 'failure', 'unknown'])

/**
 * A failed create. `outcome` says whether the client was created, as ECS's
 * event.outcome: `failure` when it wasn't, `success` when it was but its
 * secret wasn't returned, and `unknown` when it may have been.
 */
export class CreateClientCredentialsError extends Error {
  constructor(message, { outcome, cause }) {
    super(message, { cause })
    this.name = 'CreateClientCredentialsError'
    this.outcome = outcome
  }
}

/**
 * Client Sync says in a 502 whether the client was created. Without that, only
 * a refusal (4xx) means it wasn't
 *
 * @param {Response} response - An error response, which never holds a secret
 *
 * @returns {Promise<'success' | 'failure' | 'unknown'>}
 */
async function outcomeOf(response) {
  let outcome
  try {
    ;({ outcome } = await response.json())
  } catch {
    // Unreadable, so fall back to the status
  }

  if (outcomes.has(outcome)) {
    return outcome
  }

  return response.status < 500 ? 'failure' : 'unknown'
}

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

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: withTraceId(config.get('tracing.header'), {
        'Content-Type': 'application/json',
        Authorization: generateServiceAuthHeader()
      }),
      body: JSON.stringify({ clientName }),
      signal: AbortSignal.timeout(requestTimeoutMs)
    })
  } catch (err) {
    throw new CreateClientCredentialsError(
      `Failed to create client credentials: ${err.message}`,
      { outcome: 'unknown', cause: err }
    )
  }

  // Client Sync compares names ignoring case
  if (response.status === statusCodes.conflict) {
    return { isDuplicate: true }
  }

  if (!response.ok) {
    throw new CreateClientCredentialsError(
      `Failed to create client credentials: ${response.status} ${response.statusText}`,
      { outcome: await outcomeOf(response) }
    )
  }

  // A parse error would quote part of the body, which holds the secret
  let body
  try {
    body = await response.json()
  } catch {
    throw new CreateClientCredentialsError(
      'Client Sync returned client credentials that could not be read',
      { outcome: 'unknown' }
    )
  }

  const { clientId, clientSecret } = body

  if (!clientId || !clientSecret) {
    throw new CreateClientCredentialsError(
      'Client Sync returned client credentials without a secret',
      { outcome: 'unknown' }
    )
  }

  return {
    isDuplicate: false,
    credentials: { clientId, clientName, clientSecret }
  }
}
