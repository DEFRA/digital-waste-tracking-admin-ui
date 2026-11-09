import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { outcomeOf } from '#/server/common/helpers/client-sync-outcome.js'

// Client Sync allows CDP up to 120 seconds, as CDP's docs advise. Giving up
// sooner leaves the outcome unknown, but retrying a delete is safe
const requestTimeoutMs = 30_000

/**
 * A failed delete. `outcome` says whether the client was deleted, as ECS's
 * event.outcome: `failure` when it wasn't, and `unknown` when it may have been.
 */
export class DeleteClientError extends Error {
  constructor(message, { outcome, cause }) {
    super(message, { cause })
    this.name = 'DeleteClientError'
    this.outcome = outcome
  }
}

/**
 * Deletes a client of the configured service, and all its secrets, with the
 * DWT Client Sync backend, for the environment the portal is running in.
 *
 * @param {String} clientId
 *
 * @returns {Promise<{ isNotFound: Boolean }>} isNotFound when Client Sync
 * doesn't have the client, as when it has already been deleted
 */
export async function deleteClient(clientId) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}/${encodeURIComponent(clientId)}`,
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
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(requestTimeoutMs)
    })
  } catch (err) {
    throw new DeleteClientError(`Failed to delete client: ${err.message}`, {
      outcome: 'unknown',
      cause: err
    })
  }

  if (response.status === statusCodes.notFound) {
    return { isNotFound: true }
  }

  if (!response.ok) {
    throw new DeleteClientError(
      `Failed to delete client: ${response.status} ${response.statusText}`,
      await outcomeOf(response)
    )
  }

  return { isNotFound: false }
}
