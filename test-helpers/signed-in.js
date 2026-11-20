import { entraStrategy } from '#/server/plugins/entra-id.js'

/**
 * Signs a request in, for server.inject, as Entra ID would have.
 * @param {string} [username] - The user to sign in as
 * @returns {{strategy: string, credentials: {id: string, username: string, name: string}}}
 * What to give server.inject as `auth`
 */
export const signedInAs = (username = 'test1') => ({
  strategy: entraStrategy,
  credentials: { id: `${username}-id`, username, name: username }
})
