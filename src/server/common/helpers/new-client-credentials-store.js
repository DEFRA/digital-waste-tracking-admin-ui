import { randomUUID } from 'node:crypto'

import { config } from '#/config/config.js'

// Long enough to follow the redirect to the credentials page, short enough
// that a secret nobody views doesn't stay stored
const expiresInMs = 5 * 60 * 1000

const sessionKey = 'newClientCredentialsIds'

/**
 * Holds new client credentials between creating them and showing them, so the
 * credentials page can be reached by a redirect and shown only once.
 *
 * The credentials are kept in the server-side cache, never in the session,
 * as small sessions are stored in the browser's cookie. Each set gets a random
 * id for the redirect, and the session lists the ids it created, so another
 * session can't read them and two tabs each get their own.
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
     *
     * @returns {Promise<String>} The id to show them by
     */
    async save(request, credentials) {
      const id = randomUUID()

      await cache.set(id, credentials)
      request.yar.set(sessionKey, [...(request.yar.get(sessionKey) ?? []), id])

      return id
    },

    /**
     * Gets the new credentials and removes them, so they can only be shown once.
     *
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {String} id - The id they were saved with
     *
     * @returns {Promise<Object|null>} The new credentials, or null if this
     * session has none with that id
     */
    async take(request, id) {
      const ids = request.yar.get(sessionKey) ?? []

      if (!ids.includes(id)) {
        return null
      }

      request.yar.set(
        sessionKey,
        ids.filter((saved) => saved !== id)
      )

      const credentials = await cache.get(id)
      await cache.drop(id)

      return credentials
    }
  }
}
