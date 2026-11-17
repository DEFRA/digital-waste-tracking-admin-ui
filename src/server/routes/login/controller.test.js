import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('Signing in with Entra ID', () => {
  let server
  let oidc

  const claims = {
    oid: 'user-object-id',
    preferred_username: 'jo.bloggs@defra.gov.uk',
    email: 'jo.bloggs@example.com',
    name: 'Jo Bloggs'
  }

  // The cookies a browser would send back, by name, latest first
  let jar
  const cookie = () =>
    Object.entries(jar)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  const keepCookies = (response) => {
    ;(response.headers['set-cookie'] ?? []).forEach((setCookie) => {
      const [nameValue] = setCookie.split(';')
      const [name, ...value] = nameValue.split('=')
      jar[name] = value.join('=')
    })
    return response
  }
  const get = async (url) =>
    keepCookies(
      await server.inject({ method: 'GET', url, headers: { cookie: cookie() } })
    )

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    oidc = server.plugins['hapi-auth-oidc'].oidc
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    jar = {}
    vi.spyOn(oidc, 'login').mockImplementation((_request, h) =>
      h.redirect('https://entra.example/authorize').takeover()
    )
    vi.spyOn(oidc, 'callback').mockResolvedValue({ claims })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Should send someone who is not signed in to sign in, then back to the page', async () => {
    const { statusCode, headers } = await get('/software-providers')

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual('/login?redirectTo=%2Fsoftware-providers')
  })

  test('Should send them to Entra ID to sign in', async () => {
    const { statusCode, headers } = await get('/login?redirectTo=%2F')

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual('https://entra.example/authorize')
  })

  test('Should sign them in when Entra ID sends them back, and take them to where they were going', async () => {
    await get('/login?redirectTo=%2Fsoftware-providers%2Fcreate')

    const { statusCode, headers } = await get('/auth?code=a-code&state=a-state')

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual('/software-providers/create')

    const home = await get('/')
    expect(home.statusCode).toEqual(statusCodes.ok)
  })

  test('Should know them by their Entra ID username', async () => {
    let credentials
    server.ext('onPreResponse', (request, h) => {
      if (request.path === '/') {
        credentials = request.auth.credentials
      }
      return h.continue
    })

    await get('/login')
    await get('/auth?code=a-code&state=a-state')
    await get('/')

    expect(credentials).toEqual({
      id: 'user-object-id',
      username: 'jo.bloggs@defra.gov.uk',
      name: 'Jo Bloggs'
    })
  })

  test('Should start a new session when they sign in', async () => {
    await get('/login')
    const before = jar.session

    await get('/auth?code=a-code&state=a-state')

    expect(jar.session).toBeDefined()
    expect(jar.session).not.toEqual(before)
  })

  test.each([
    ['another site', 'https://example.com/'],
    ['a protocol-relative address', '//example.com/']
  ])(
    'Should not send them on to %s after signing in',
    async (_, redirectTo) => {
      await get(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)

      const { headers } = await get('/auth?code=a-code&state=a-state')

      expect(headers.location).toEqual('/')
    }
  )

  test('Should show an error, not start signing in again, when signing in fails', async () => {
    oidc.callback.mockRejectedValue(new Error('state mismatch'))

    await get('/login')
    const { statusCode, headers } = await get('/auth?code=a-code&state=wrong')

    expect(statusCode).toEqual(statusCodes.forbidden)
    expect(headers.location).toBeUndefined()

    const home = await get('/')
    expect(home.headers.location).toMatch(/^\/login/)
  })

  test('Should show an error, not try to sign in again, when Entra ID cannot be reached', async () => {
    oidc.login.mockRejectedValue(new Error('fetch failed'))

    const { statusCode, headers } = await get('/login')

    expect(statusCode).toEqual(statusCodes.badGateway)
    expect(headers.location).toBeUndefined()
  })
})
