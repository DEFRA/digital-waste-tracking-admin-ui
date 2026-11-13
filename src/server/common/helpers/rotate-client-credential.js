import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { outcomeOf } from '#/server/common/helpers/client-sync-outcome.js'

// Client Sync allows CDP up to 120 seconds, as CDP's docs advise. Giving up
// sooner leaves the outcome unknown, so a retry could rotate twice
const requestTimeoutMs = 30_000

/**
 * A failed rotation. `outcome` says whether the secret was rotated, as ECS's
 * event.outcome: `failure` when it wasn't, `success` when it was but its
 * secret wasn't returned, and `unknown` when it may have been.
 */
export class RotateClientCredentialError extends Error {
  constructor(message, { outcome, cause }) {
    super(message, { cause })
    this.name = 'RotateClientCredentialError'
    this.outcome = outcome
  }
}

/**
 * Rotates a client's secret with the DWT Client Sync backend, for the
 * environment the portal is running in. The client keeps its existing secret
 * unless it already has two, in which case the oldest is removed.
 *
 * The response holds the new client secret, which is only available now, so it's
 * never logged, including when the request fails.
 *
 * @param {String} clientId - The client whose secret to rotate
 *
 * @returns {Promise<{ isNotFound: Boolean, credentials?: { clientId: String, clientName: String, clientSecret: String } }>}
 * isNotFound when Client Sync doesn't have the client, as when it's since been deleted
 */
export async function rotateClientCredential(clientId) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}/${encodeURIComponent(clientId)}/rotate`,
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
    throw new RotateClientCredentialError(
      `Failed to rotate client credential: ${err.message}`,
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
    throw new RotateClientCredentialError(
      `Failed to rotate client credential: ${response.status} ${response.statusText}`,
      await outcomeOf(response)
    )
  }

  // A parse error would quote part of the body, which holds the secret
  let body
  try {
    body = await response.json()
  } catch {
    throw new RotateClientCredentialError(
      'Client Sync returned rotated credentials that could not be read',
      { outcome: 'unknown' }
    )
  }

  const { clientSecret } = body ?? {}

  // The secret was rotated, as Client Sync says when CDP returns no secret
  if (!clientSecret) {
    throw new RotateClientCredentialError(
      'Client Sync returned rotated credentials without a secret',
      { outcome: 'success' }
    )
  }

  return {
    isNotFound: false,
    credentials: { clientId, clientSecret }
  }
}
