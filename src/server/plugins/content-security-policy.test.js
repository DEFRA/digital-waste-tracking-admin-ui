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

  test('Should let a form be redirected to Entra ID to sign in again', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/',
      auth: signedInAs()
    })

    // floci-az, which stands in for Entra ID outside production
    expect(resp.headers['content-security-policy']).toContain(
      "form-action 'self' http://floci-az:4577"
    )
  })
})
