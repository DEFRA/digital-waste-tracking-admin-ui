import { config } from '#/config/config.js'

/**
 * Generates a Basic auth header for authenticating with internal backend
 * services from the configured service credentials.
 *
 * @returns {String} The Basic auth header value
 */
export function generateServiceAuthHeader() {
  const username = config.get('serviceAuth.username')
  const password = config.get('serviceAuth.password')

  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}
