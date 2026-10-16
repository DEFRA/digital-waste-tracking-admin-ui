import { randomUUID } from 'node:crypto'

import { config } from '#/config/config.js'

// Long enough to follow the redirect to the credentials page, short enough
// that a secret nobody views doesn't stay stored
const expiresInMs = 5 * 60 * 1000

const sessionKey = 'newClientCredentialsKey'

/**
 * Holds new client credentials between creating them and showing them, so the
 * credentials page can be reached by a redirect and shown only once.
 *
 * The credentials are kept in the server-side cache, never in the session,
 * as small sessions are stored in the browser's cookie. The session only holds
 * a random key to them.
 *
 * @param {import('@hapi/hapi').Server} server - The server
 */
export function createNewClientCredentialsStore(server) {
  const cache = server.cache({
    cache: config.get('session.cache.name'),
    segment: 'new-client-credentials',
    expiresIn: expiresInMs
  })

  return {
    /**
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {Object} credentials - The new credentials
     */
    async save(request, credentials) {
      const key = randomUUID()

      await cache.set(key, credentials)
      request.yar.set(sessionKey, key)
    },

    /**
     * Gets the new credentials and removes them, so they can only be shown once.
     *
     * @param {import('@hapi/hapi').Request} request - The request
     *
     * @returns {Promise<Object|null>} The new credentials, or null if there are none
     */
    async take(request) {
      const key = request.yar.get(sessionKey, true)

      if (!key) {
        return null
      }

      const credentials = await cache.get(key)
      await cache.drop(key)

      return credentials
    }
  }
}
