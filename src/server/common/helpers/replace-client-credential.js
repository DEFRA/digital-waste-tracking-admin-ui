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
 * Replace is used when the client only has one secret.
 * It calls the /replace endpoint in the dwt-client-sync service,
 * which creates a new secret then deletes the old one.
 *
 * If dwt-client-sync successfully creates a new secret but fails to remove the old one
 * 502 is returned.
 * Since the secret value is only ever returned at creation and can't be fetched again,
 * dwt-client-sync returns the secret value in the body of the 502 error
 *
 * This response is never logged, as it contains the secret value.
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
    // If the error is a 502 it should still contain the new secret
    const body = await bodyOf(response.clone())
    const credentials = credentialsOf(body, clientId)

    if (credentials) {
      return {
        isNotFound: false,
        credentials,
        outcome: body.outcome ?? 'unknown'
      }
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
