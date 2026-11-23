import { JSDOM } from 'jsdom'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const documentOf = (html) => new JSDOM(html).window.document
const textOf = (element) => element.textContent.replace(/\s+/g, ' ').trim()
const headingsOf = (document) =>
  [...document.querySelectorAll('main h1')].map(textOf)
const listItemsOf = (document) =>
  [...document.querySelectorAll('main ul.govuk-list--bullet li')].map(textOf)

/**
 * Signed out, the header has the green line, and there's no navigation
 *
 * @param {Document} document
 */
function expectSignedOutHeader(document) {
  expect(
    document
      .querySelector('header.defra-header')
      .classList.contains('app-defra-header--green-line')
  ).toBe(true)
  expect(document.querySelector('nav')).toBeNull()
  // One header, main and footer landmark each
  expect(document.querySelectorAll('header')).toHaveLength(1)
  expect(document.querySelectorAll('main')).toHaveLength(1)
  expect(document.querySelectorAll('footer')).toHaveLength(1)
}

/**
 * @param {Document} document
 * @param {String} tryAgainHref - Where "Try signing in again" goes
 */
function expectErrorPage(document, tryAgainHref) {
  expect(document.title.trim()).toEqual(
    'Error: There was a problem signing you in - Local - DWT admin portal'
  )
  expect(headingsOf(document)).toEqual(['There was a problem signing you in'])
  expect(textOf(document.querySelector('main p'))).toEqual(
    'You have not been signed in. You will need to try again.'
  )
  expectSignedOutHeader(document)

  const button = document.querySelector(
    '[data-testid="try-signing-in-again-button"]'
  )
  expect(textOf(button)).toEqual('Try signing in again')
  expect(button.getAttribute('href')).toEqual(tryAgainHref)
}

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
    expect(headers.location).toEqual(
      '/sign-in?redirectTo=%2Fsoftware-providers'
    )
  })

  test("Should keep the page's query, so it comes back to the same page", async () => {
    const { headers } = await get('/software-providers?sort=name')

    expect(headers.location).toEqual(
      '/sign-in?redirectTo=%2Fsoftware-providers%3Fsort%3Dname'
    )
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

  test('Should start a new session when they sign in, so the one before stays signed out', async () => {
    await get('/login')
    const before = jar.session

    await get('/auth?code=a-code&state=a-state')
    expect((await get('/')).statusCode).toEqual(statusCodes.ok)

    // As someone holding the cookie from before signing in would
    jar = { session: before }
    const { headers } = await get('/')
    expect(headers.location).toMatch(/^\/sign-in/)
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

  test('Should show the error page, not start signing in again, when signing in fails', async () => {
    oidc.callback.mockRejectedValue(new Error('state mismatch'))

    await get('/login?redirectTo=%2Fsoftware-providers')
    const { statusCode, headers, result } = await get(
      '/auth?code=a-code&state=wrong'
    )

    expect(statusCode).toEqual(statusCodes.forbidden)
    expect(headers.location).toBeUndefined()
    expectErrorPage(
      documentOf(result),
      '/login?redirectTo=%2Fsoftware-providers'
    )

    const home = await get('/')
    expect(home.headers.location).toMatch(/^\/sign-in/)
  })

  test('Should show the error page, not try to sign in again, when Entra ID cannot be reached', async () => {
    oidc.login.mockRejectedValue(new Error('fetch failed'))

    const { statusCode, headers, result } = await get('/login')

    expect(statusCode).toEqual(statusCodes.badGateway)
    expect(headers.location).toBeUndefined()
    expectErrorPage(documentOf(result), '/login')
  })

  test('Should sign them out when signing in again fails', async () => {
    await get('/login')
    await get('/auth?code=a-code&state=a-state')
    expect((await get('/')).statusCode).toEqual(statusCodes.ok)

    oidc.callback.mockRejectedValue(new Error('cancelled'))
    await get('/login')
    await get('/auth?error=access_denied&state=a-state')

    expect((await get('/')).headers.location).toMatch(/^\/sign-in/)
  })

  describe('Sign in page', () => {
    test('Should send someone already signed in straight on to where they were going', async () => {
      await get('/login')
      await get('/auth?code=a-code&state=a-state')

      const { statusCode, headers } = await get(
        '/sign-in?redirectTo=%2Fsoftware-providers'
      )

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toEqual('/software-providers')
    })

    test('Should say what the portal is for, with a button to sign in', async () => {
      const { statusCode, result } = await get(
        '/sign-in?redirectTo=%2Fsoftware-providers'
      )
      const document = documentOf(result)

      expect(statusCode).toEqual(statusCodes.ok)
      expect(document.title.trim()).toEqual(
        'Sign in - Local - DWT admin portal'
      )
      expect(headingsOf(document)).toEqual(['Sign in to DWT admin portal'])
      expect(textOf(document.querySelector('main p'))).toEqual(
        'DWT admin portal allows you to:'
      )
      expect(listItemsOf(document)).toEqual([
        'manage software provider credentials',
        'search waste organisations'
      ])
      expectSignedOutHeader(document)

      // Then on to where they were going, once signed in
      const button = document.querySelector(
        '[data-testid="continue-to-sign-in-button"]'
      )
      expect(textOf(button)).toEqual('Continue to sign in')
      expect(button.getAttribute('href')).toEqual(
        '/login?redirectTo=%2Fsoftware-providers'
      )
    })

    test.each([
      ['nowhere in particular', '/sign-in', '/login'],
      ['another site', '/sign-in?redirectTo=%2F%2Fexample.com', '/login']
    ])(
      'Should start signing in for the home page when going %s',
      async (_, url, href) => {
        const document = documentOf((await get(url)).result)

        expect(
          document
            .querySelector('[data-testid="continue-to-sign-in-button"]')
            .getAttribute('href')
        ).toEqual(href)
      }
    )
  })
})
