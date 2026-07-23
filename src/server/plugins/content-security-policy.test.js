import { createServer } from '#/server/server.js'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
