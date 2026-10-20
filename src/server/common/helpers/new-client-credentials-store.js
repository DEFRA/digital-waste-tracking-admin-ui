import { randomUUID } from 'node:crypto'

import { config } from '#/config/config.js'

// Long enough to follow the redirect to the credentials page, short enough
// that a secret nobody views doesn't stay stored
const expiresInMs = 5 * 60 * 1000

/**
 * @param {import('@hapi/hapi').Request} request - The request
 * @returns {String|undefined} The signed-in user, who owns what they create
 */
const ownerOf = (request) => request.auth.credentials?.username

/**
 * Holds new client credentials between creating them and showing them, so the
 * credentials page can be reached by a redirect and shown only once.
 *
 * The credentials are kept in the server-side cache, never in the session,
 * as small sessions are stored in the browser's cookie. Each set gets a random
 * id for the redirect and records the user who created it, so only they can
 * read it. Nothing is written to the session, so two tabs creating at once
 * can't overwrite each other.
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

      await cache.set(id, { owner: ownerOf(request), credentials })

      return id
    },

    /**
     * Gets the new credentials and removes them, so they can only be shown once.
     *
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {String} id - The id they were saved with
     *
     * @returns {Promise<Object|null>} The new credentials, or null if there are
     * none with that id that this user created
     */
    async take(request, id) {
      const owner = ownerOf(request)
      const saved = await cache.get(id)

      if (!owner || saved?.owner !== owner) {
        return null
      }

      await cache.drop(id)

      return saved.credentials
    }
  }
}
