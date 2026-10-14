import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const [username, password] = Buffer.from(requestBasicAuthTest1, 'base64')
  .toString()
  .split(':')

/**
 * Logs in and returns the dwtAuth cookie the server sets.
 *
 * @returns {Promise<String>} The dwtAuth Set-Cookie header
 */
async function loginCookie() {
  const server = await createServer()
  await server.initialize()

  try {
    const { headers } = await server.inject({
      method: 'POST',
      url: '/login',
      payload: { username, password, redirectTo: '/' }
    })

    return [headers['set-cookie']]
      .flat()
      .find((cookie) => cookie?.startsWith('dwtAuth='))
  } finally {
    await server.stop({ timeout: 0 })
  }
}

describe('#dwtAuth cookie', () => {
  const originalSecure = config.get('session.cookie.secure')

  beforeAll(() => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1
  })

  afterEach(() => {
    config.set('session.cookie.secure', originalSecure)
  })

  test('Should be Secure when secure cookies are on, as in production', async () => {
    config.set('session.cookie.secure', true)

    expect(await loginCookie()).toMatch(/; Secure/)
  })

  test('Should not be Secure when secure cookies are off, so login works over plain HTTP locally', async () => {
    config.set('session.cookie.secure', false)

    const cookie = await loginCookie()

    expect(cookie).toBeDefined()
    expect(cookie).not.toMatch(/; Secure/)
  })
})
