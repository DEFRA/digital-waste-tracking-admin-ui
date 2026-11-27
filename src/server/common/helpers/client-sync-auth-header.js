import { WebIdentityTokenProvider } from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import { generateServiceAuthHeader } from '#/server/common/helpers/generate-service-auth-header.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const logger = createLogger()

// Renews the token a little before it expires, so a request doesn't arrive
// with one that has just run out
const earlyRefreshMs = 30_000

/** @type {WebIdentityTokenProvider | undefined} */
let tokenProvider

/**
 * The Authorization header for calls to DWT Client Sync: an AWS STS token
 * when DWT_CLIENT_SYNC_STS_AUDIENCE is set (CDP's service-to-service auth),
 * and basic auth otherwise. The token is cached and renewed before it expires.
 * @returns {Promise<string>} The Authorization header value
 */
export async function clientSyncAuthHeader() {
  const audience = config.get('clientSyncAuth.stsAudience')

  if (!audience) {
    return generateServiceAuthHeader()
  }

  tokenProvider ??= new WebIdentityTokenProvider({
    audience: [audience],
    earlyRefreshMs
  })

  const token = await tokenProvider.getCredentials(logger)

  // The provider logs why, and gives no token when it has never had one
  if (!token) {
    throw new Error('Failed to get an STS token for DWT Client Sync')
  }

  return `Bearer ${token}`
}
