import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { outcomeOf } from '#/server/common/helpers/client-sync-outcome.js'

// Client Sync allows CDP up to 120 seconds, as CDP's docs advise. Giving up
// sooner leaves the outcome unknown, but purging keeps the newest secret, so
// a retry can't leave the client without one
const requestTimeoutMs = 30_000

/**
 * A failed removal. `outcome` says whether the oldest secret was removed, as
 * ECS's event.outcome: `failure` when it wasn't, and `unknown` when it may
 * have been.
 */
export class RemoveClientCredentialError extends Error {
  constructor(message, { outcome, cause }) {
    super(message, { cause })
    this.name = 'RemoveClientCredentialError'
    this.outcome = outcome
  }
}

/**
 * Removes a client's oldest secret with the DWT Client Sync backend, for the
 * environment the portal is running in. The client's newest secret is always
 * kept, so a client with one secret is left with it.
 *
 * @param {String} clientId - The client whose oldest secret to remove
 *
 * @returns {Promise<{ isNotFound: Boolean }>} isNotFound when Client Sync
 * doesn't have the client, as when it's since been deleted
 */
export async function removeClientCredential(clientId) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}/${encodeURIComponent(clientId)}/purge`,
    config.get('services.clientSync')
  )

  const headers = withTraceId(config.get('tracing.header'), {
    Authorization: generateServiceAuthHeader()
  })

  // Built first, so only fetch's errors are caught: once it's called, the
  // request may have been sent
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(requestTimeoutMs)
    })
  } catch (err) {
    throw new RemoveClientCredentialError(
      `Failed to remove client credential: ${err.message}`,
      { outcome: 'unknown', cause: err }
    )
  }

  if (response.status === statusCodes.notFound) {
    return { isNotFound: true }
  }

  // Nothing changed: another client has the name, or the stored client is out of date
  if (response.status === statusCodes.conflict) {
    return { isNotFound: false, isConflict: true }
  }

  if (!response.ok) {
    throw new RemoveClientCredentialError(
      `Failed to remove client credential: ${response.status} ${response.statusText}`,
      await outcomeOf(response)
    )
  }

  return { isNotFound: false }
}
