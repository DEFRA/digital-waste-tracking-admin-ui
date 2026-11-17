import { entraStrategy } from '#/server/plugins/entra-id.js'

/**
 * Signs a request in, for server.inject, as Entra ID would have.
 *
 * @param {String} [username='test1']
 * @returns {{ strategy: String, credentials: Object }}
 */
export const signedInAs = (username = 'test1') => ({
  strategy: entraStrategy,
  credentials: { id: `${username}-id`, username, name: username }
})
