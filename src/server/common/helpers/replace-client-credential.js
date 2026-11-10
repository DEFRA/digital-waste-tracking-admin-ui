import { withTraceId } from '@defra/hapi-tracing'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { outcomeOf } from '#/server/common/helpers/client-sync-outcome.js'

// Client Sync allows CDP up to 120 seconds, as CDP's docs advise. Giving up
// sooner leaves the outcome unknown, so a retry could replace twice
const requestTimeoutMs = 30_000

/**
 * A failed replacement. `outcome` says whether the secret was replaced, as
 * ECS's event.outcome: `failure` when it wasn't, `success` when it was but its
 * secret wasn't returned, and `unknown` when it may have been.
 */
export class ReplaceClientCredentialError extends Error {
  constructor(message, { outcome, cause }) {
    super(message, { cause })
    this.name = 'ReplaceClientCredentialError'
    this.outcome = outcome
  }
}

/**
 * Replaces a client's only secret with the DWT Client Sync backend, for the
 * environment the portal is running in. The old secret stops working, so a
 * client is left with one secret: the new one.
 *
 * Client Sync issues the new secret before it removes the old one, so when CDP
 * fails to remove it the reply is a 502 that still holds the new secret. That
 * secret can't be fetched again, so it's returned as a partial success and the
 * old secret is purged to finish the replacement.
 *
 * The response holds the new client secret, which is only available now, so it's
 * never logged, including when the request fails.
 *
 * @param {String} clientId - The client whose secret to replace
 *
 * @returns {Promise<{ isNotFound: Boolean, isConflict?: Boolean, credentials?: { clientId: String, clientSecret: String } }>}
 * isNotFound when Client Sync doesn't have the client, as when it's since been
 * deleted, and isConflict when it can't replace this client's secret
 */
export async function replaceClientCredential(clientId) {
  const tenantServiceName = config.get('clientCredentials.tenantServiceName')
  const url = new URL(
    `/clients/${encodeURIComponent(tenantServiceName)}/${encodeURIComponent(clientId)}/replace`,
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
    throw new ReplaceClientCredentialError(
      `Failed to replace client credential: ${err.message}`,
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
    // A 502 may still hold the new secret, which is the only chance to keep it
    const body = await bodyOf(response)
    const credentials = credentialsOf(body, clientId)

    if (credentials) {
      return { isNotFound: false, credentials }
    }

    throw new ReplaceClientCredentialError(
      `Failed to replace client credential: ${response.status} ${response.statusText}`,
      await outcomeOf(response)
    )
  }

  // A parse error would quote part of the body, which holds the secret
  const body = await bodyOf(response)
  const credentials = credentialsOf(body, clientId)

  // The secret was replaced, as Client Sync says when CDP returns no secret
  if (!credentials) {
    throw new ReplaceClientCredentialError(
      'Client Sync returned replaced credentials without a secret',
      { outcome: 'success' }
    )
  }

  return { isNotFound: false, credentials }
}

/**
 * @param {Response} response
 *
 * @returns {Promise<Object|undefined>} The body, or undefined when it isn't JSON
 */
async function bodyOf(response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

/**
 * @param {Object} [body]
 * @param {String} clientId
 *
 * @returns {{ clientId: String, clientSecret: String }|undefined} The new
 * secret, or undefined when the body doesn't have one for this client
 */
function credentialsOf(body, clientId) {
  const { clientSecret } = body ?? {}

  if (!clientSecret) {
    return undefined
  }

  // The body's client id, when it says which client it is, must be this one
  if (typeof body.clientId === 'string' && body.clientId !== clientId) {
    return undefined
  }

  return { clientId, clientSecret }
}
