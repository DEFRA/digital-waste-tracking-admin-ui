import { randomUUID } from 'node:crypto'

import { config } from '#/config/config.js'

// Long enough to follow the redirect to the credentials page, short enough
// that a secret nobody views doesn't stay stored
const expiresInMs = 5 * 60 * 1000

/**
 * @typedef {object} NewClientCredentials
 * What's stored for the credentials page to show once. It holds the client
 * secret, which is only available when the credentials are created, so it's
 * kept no longer than it takes to show it.
 * @property {string} clientId - The client's ID
 * @property {string} clientName - The client's name
 * @property {string} clientSecret - The new secret, which isn't kept here after it's shown
 * @property {string} generatedOn - When they were generated, as an ISO 8601 string
 * @property {boolean} [isPartialReplace] - Set when replacing a secret whose old one may still work
 */

/**
 * @typedef {object} NewClientCredentialsStore
 * @property {(request: import('@hapi/hapi').Request, credentials: NewClientCredentials) => Promise<string>} save
 * Stores them, and returns the id to show them by
 * @property {(request: import('@hapi/hapi').Request, id: string) => Promise<NewClientCredentials | null>} take
 * Gets and removes them, or null when this user has none with that id
 * @property {(request: import('@hapi/hapi').Request, id: string) => Promise<string | null>} shownClientId
 * The client whose credentials this user has been shown, or null
 */

/**
 * @param {import('@hapi/hapi').Request} request - The request
 * @returns {string | undefined} The signed-in user, who owns what they create
 */
const ownerOf = (request) => request.auth.credentials?.username

// hapi refuses to provision a segment twice on one server, and both creating
// and replacing credentials store what they make, so they share one. The
// segment belongs to hapi's core, which every server of that core shares
const segments = new WeakMap()

/**
 * @param {import('@hapi/hapi').Server} server - The server, whose cache the
 * credentials are kept in
 * @returns {import('@hapi/catbox').ClientApi} The cache's segment
 */
function cacheFor(server) {
  const key = server._core ?? server

  if (!segments.has(key)) {
    segments.set(
      key,
      server.cache({
        cache: config.get('session.cache.name'),
        segment: 'new-client-credentials',
        expiresIn: expiresInMs
      })
    )
  }

  return segments.get(key)
}

/**
 * Holds new client credentials between creating them and showing them, so the
 * credentials page can be reached by a redirect and shown only once.
 *
 * The credentials are kept in their own server-side cache, never in the
 * session. Each set gets a random
 * id for the redirect and records the user who created it, so only they can
 * read it. Nothing is written to the session, so two tabs creating at once
 * can't overwrite each other.
 * @param {import('@hapi/hapi').Server} server - The server
 * @returns {NewClientCredentialsStore} The store
 */
export function createNewClientCredentialsStore(server) {
  const cache = cacheFor(server)

  return {
    /**
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {NewClientCredentials} credentials - The new credentials
     * @returns {Promise<string>} The id to show them by
     */
    async save(request, credentials) {
      const id = randomUUID()

      await cache.set(id, { owner: ownerOf(request), credentials })

      return id
    },

    /**
     * Gets the new credentials and removes them, so they can only be shown once.
     * Only the client ID is kept, so coming back can go to that client.
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {string} id - The id they were saved with
     * @returns {Promise<NewClientCredentials | null>} The new credentials, or null if there are
     * none with that id that this user created
     */
    async take(request, id) {
      const owner = ownerOf(request)
      const saved = await cache.get(id)

      if (!owner || saved?.owner !== owner || !saved.credentials) {
        return null
      }

      // Kept as long as a session, as it no longer holds the secret
      await cache.set(
        id,
        { owner, shownClientId: saved.credentials.clientId },
        config.get('session.cache.ttl')
      )

      return saved.credentials
    },

    /**
     * @param {import('@hapi/hapi').Request} request - The request
     * @param {string} id - The id they were saved with
     * @returns {Promise<string | null>} The client whose credentials this user
     * has already been shown, or null if there's none
     */
    async shownClientId(request, id) {
      const owner = ownerOf(request)
      const saved = await cache.get(id)

      if (!owner || saved?.owner !== owner) {
        return null
      }

      return saved.shownClientId ?? null
    }
  }
}
