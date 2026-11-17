import { createServer } from '#/server/server.js'
import { signedInAs } from '#/test-helpers/signed-in.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
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
      auth: signedInAs()
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
