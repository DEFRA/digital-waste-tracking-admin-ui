import { JSDOM } from 'jsdom'

import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import {
  requestBasicAuthTest1,
  requestBasicAuthTest2,
  userBasicAuthTest1,
  userBasicAuthTest2
} from '#/test-helpers/constants.js'

const { mockAudit } = vi.hoisted(() => ({ mockAudit: vi.fn() }))

vi.mock('@defra/cdp-auditing', () => ({ audit: mockAudit }))

const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

const created = {
  clientId: 'new-client-id',
  clientName: 'Waste_Technologies_Software',
  clientSecret: 'new-client-secret'
}

function documentOf(result) {
  return new JSDOM(result).window.document
}

/**
 * @param {Object} headers - A response's headers
 *
 * @returns {String} The cookies it sets, for the next request
 */
function cookiesFrom(headers) {
  return [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

describe('Create new credentials', () => {
  let server
  let fetchMock

  function clientSyncRespondsWith(status, body) {
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'Status text',
      json: () => Promise.resolve(body)
    })
  }

  function submitName(clientName) {
    return server.inject({
      method: 'POST',
      url: '/software-providers/create',
      headers: auth,
      payload: { clientName }
    })
  }

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1
    process.env.USER_BASIC_AUTH_TEST2 = userBasicAuthTest2

    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    clientSyncRespondsWith(200, created)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('Software providers page', () => {
    test('Should have a secondary "Create new credentials" button to the name page', async () => {
      clientSyncRespondsWith(200, [])

      const { result } = await server.inject({
        method: 'GET',
        url: '/software-providers',
        headers: auth
      })
      const button = documentOf(result).querySelector(
        '[data-testid="create-credentials-button"]'
      )

      expect(button.textContent.trim()).toEqual('Create new credentials')
      expect(button.getAttribute('href')).toEqual('/software-providers/create')
      expect(button.classList).toContain('govuk-button--secondary')
      expect(button.classList).toContain('govuk-!-margin-bottom-7')
    })
  })

  describe('Name page', () => {
    test('Should ask for the client name', async () => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/software-providers/create',
        headers: auth
      })
      const document = documentOf(result)
      const input = document.querySelector('#clientName')

      expect(statusCode).toEqual(200)
      expect(document.title.trim()).toEqual(
        'What is the name of the software provider and package? - DWT admin portal'
      )
      expect(getElementText(document, 'app-heading-caption')).toEqual(
        'Create local environment credentials'
      )
      expect(document.querySelector('.govuk-caption-l').tagName).toEqual('SPAN')
      expect(document.querySelectorAll('h1')).toHaveLength(1)
      expect(getElementText(document, 'app-heading-title')).toEqual(
        'What is the name of the software provider and package?'
      )
      expect(
        document.querySelector('label[for="clientName"]').textContent.trim()
      ).toEqual('Client name')
      expect(
        document.querySelector('#clientName-hint').textContent.trim()
      ).toEqual(
        'Enter the name of the software provider and software package, using letters and underscores only. For example, Waste_Technologies_Software'
      )
      expect(input.getAttribute('aria-describedby')).toEqual('clientName-hint')
      expect(input.getAttribute('autocomplete')).toEqual('off')
      expect(input.getAttribute('spellcheck')).toEqual('false')
      expect(input.classList).toContain('govuk-!-width-two-thirds')
      expect(getElementText(document, 'generate-credentials-button')).toEqual(
        'Generate credentials'
      )
      // A second submission would only show "already exists", losing the secret
      expect(
        document.querySelector('form').getAttribute('data-module')
      ).toEqual('app-single-submit')
      expect(
        document
          .querySelector('[data-testid="generate-credentials-button"]')
          .getAttribute('data-prevent-double-click')
      ).toEqual('true')
      expect(
        document
          .querySelector('[data-testid="cancel-link"]')
          .getAttribute('href')
      ).toEqual('/software-providers')
    })

    test('Should name the environment the portal is running in', async () => {
      const originalEnvironment = config.get('cdpEnvironment')
      config.set('cdpEnvironment', 'ext-test')

      try {
        const { result } = await server.inject({
          method: 'GET',
          url: '/software-providers/create',
          headers: auth
        })

        expect(
          getElementText(documentOf(result), 'app-heading-caption')
        ).toEqual('Create external test environment credentials')
      } finally {
        config.set('cdpEnvironment', originalEnvironment)
      }
    })

    test.each([
      ['empty', '', 'Enter a client name'],
      ['blank', '   ', 'Enter a client name'],
      [
        'not just letters and underscores',
        'Waste-Tech 2',
        'Client name must only include letters and underscores'
      ],
      [
        'too long',
        'a'.repeat(129),
        'Client name must be 128 characters or fewer'
      ]
    ])(
      'Should show an error, without creating anything, when the name is %s',
      async (_, clientName, message) => {
        const { statusCode, result } = await submitName(clientName)
        const document = documentOf(result)

        expect(statusCode).toEqual(400)
        expect(document.title.trim()).toEqual(
          'Error: What is the name of the software provider and package? - DWT admin portal'
        )
        expect(
          document
            .querySelector('[data-testid="error-summary"]')
            .textContent.replace(/\s+/g, ' ')
            .trim()
        ).toEqual(`There is a problem ${message}`)
        expect(
          document
            .querySelector('[data-testid="error-summary"] a')
            .getAttribute('href')
        ).toEqual('#clientName')
        expect(
          document.querySelector('#clientName-error').textContent.trim()
        ).toEqual(`Error: ${message}`)
        expect(document.querySelector('#clientName').value).toEqual(clientName)
        expect(fetchMock).not.toHaveBeenCalled()
      }
    )

    test('Should show an error when a client with the name already exists', async () => {
      clientSyncRespondsWith(409, {})

      const { statusCode, result } = await submitName('Existing_Client')
      const document = documentOf(result)

      expect(statusCode).toEqual(409)
      expect(
        document.querySelector('#clientName-error').textContent.trim()
      ).toEqual(
        'Error: A client with this name already exists. Enter a different client name'
      )
      expect(document.querySelector('#clientName').value).toEqual(
        'Existing_Client'
      )
      expect(mockAudit).not.toHaveBeenCalled()
    })

    test('Should show the error page when Client Sync fails', async () => {
      clientSyncRespondsWith(502, {})

      const { statusCode } = await submitName('Waste_Technologies_Software')

      expect(statusCode).toEqual(500)
      expect(mockAudit).not.toHaveBeenCalled()
    })
  })

  describe('Credentials page', () => {
    // The clock stays at this time for the rest of the test, so the stored
    // credentials don't expire before they're read
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-15T15:49:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function createCredentials() {
      const response = await submitName('Waste_Technologies_Software')

      return { response, cookie: cookiesFrom(response.headers) }
    }

    function getCredentialsPage(cookie, url) {
      return server.inject({
        method: 'GET',
        url,
        headers: { ...auth, cookie }
      })
    }

    test('Should create the client and go to the credentials page', async () => {
      const { response } = await createCredentials()

      expect(response.statusCode).toEqual(302)
      expect(response.headers.location).toMatch(
        /^\/software-providers\/credentials\/[0-9a-f-]{36}$/
      )
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        clientName: 'Waste_Technologies_Software'
      })
    })

    test('Should not put the secret in a cookie', async () => {
      const { response } = await createCredentials()

      expect(JSON.stringify(response.headers)).not.toContain(
        created.clientSecret
      )
    })

    test('Should record who created which client, without the secret', async () => {
      await createCredentials()

      expect(mockAudit).toHaveBeenCalledWith({
        event: 'client-credentials-created',
        user: 'test1',
        clientId: 'new-client-id',
        clientName: 'Waste_Technologies_Software',
        tenantServiceName: 'waste-movement-external-api'
      })
      expect(JSON.stringify(mockAudit.mock.calls)).not.toContain(
        created.clientSecret
      )
    })

    test('Should show the new credentials, once, and not let them be cached', async () => {
      const { response, cookie } = await createCredentials()
      const url = response.headers.location

      const { statusCode, headers, result } = await getCredentialsPage(
        cookie,
        url
      )
      const document = documentOf(result)
      const panel = document.querySelector(
        '[data-testid="client-credentials-panel"]'
      )

      expect(statusCode).toEqual(200)
      expect(headers['cache-control']).toEqual('no-store')
      expect(document.title.trim()).toEqual(
        'Copy the client credentials - DWT admin portal'
      )
      expect(getElementText(document, 'app-heading-caption')).toEqual(
        'Manage client credentials'
      )
      expect(getElementText(document, 'app-heading-title')).toEqual(
        'Copy the client credentials'
      )
      const warning = document.querySelector('[data-testid="copy-warning"]')
      expect(
        warning
          .querySelector('.govuk-warning-text__icon')
          .getAttribute('aria-hidden')
      ).toEqual('true')
      expect(
        warning
          .querySelector('.govuk-warning-text__text')
          .textContent.replace(/\s+/g, ' ')
          .trim()
      ).toEqual(
        'Warning Copy the client secret before leaving this page. Once you leave this page, you cannot view the client secret again.'
      )
      // So the browser's back/forward cache can't show the secret again
      const showOnce = document.querySelector('[data-module="app-show-once"]')
      expect(showOnce.getAttribute('data-leave-to')).toEqual(
        '/software-providers'
      )
      expect(
        [...showOnce.querySelectorAll('[data-show-once]')].map((value) =>
          value.getAttribute('data-testid')
        )
      ).toEqual(['client-id', 'client-secret'])
      expect(panel.tagName).toEqual('ARTICLE')
      expect(panel.getAttribute('aria-label')).toEqual(
        'Client credentials generated on 15 October 2026 at 4:49pm'
      )
      expect(
        [...panel.querySelectorAll('dt')].map((label) => [
          label.textContent.trim(),
          label.nextElementSibling.textContent.trim()
        ])
      ).toEqual([
        ['Generated on', '15 October 2026 at 4:49pm'],
        ['Local environment', 'http://localhost:3001'],
        ['Client ID', 'new-client-id'],
        ['Client secret', 'new-client-secret']
      ])
      expect(document.querySelector('.app-copy').hasAttribute('hidden')).toBe(
        true
      )
      expect(
        document
          .querySelector('[data-testid="copy-button"]')
          .getAttribute('aria-label')
      ).toEqual('Copy client credentials')
      expect(
        document
          .querySelector('[data-testid="copy-status"]')
          .getAttribute('role')
      ).toEqual('status')

      const close = document.querySelector('[data-testid="close-button"]')
      expect(close.textContent.trim()).toEqual('Close')
      expect(close.getAttribute('href')).toEqual('/software-providers')
      expect(close.classList).toContain('govuk-!-margin-top-6')
      expect(document.querySelector('.govuk-back-link')).toBeNull()

      const again = await getCredentialsPage(cookie, url)
      expect(again.statusCode).toEqual(302)
      expect(again.headers.location).toEqual('/software-providers')
      expect(again.payload).not.toContain(created.clientSecret)
    })

    test("Should not show another user's new credentials", async () => {
      const { response } = await createCredentials()

      const otherUser = await server.inject({
        method: 'GET',
        url: response.headers.location,
        headers: { Authorization: `Basic ${requestBasicAuthTest2}` }
      })

      expect(otherUser.statusCode).toEqual(302)
      expect(otherUser.headers.location).toEqual('/software-providers')
      expect(otherUser.payload).not.toContain(created.clientSecret)
    })

    test('Should go to the Software providers page when there are no new credentials', async () => {
      const { statusCode, headers } = await getCredentialsPage(
        '',
        '/software-providers/credentials/unknown-id'
      )

      expect(statusCode).toEqual(302)
      expect(headers.location).toEqual('/software-providers')
    })

    test('Should show each of two creates its own credentials, as from two tabs', async () => {
      const first = await createCredentials()
      clientSyncRespondsWith(200, {
        clientId: 'second-client-id',
        clientName: 'Second_Client',
        clientSecret: 'second-client-secret'
      })
      const second = await server.inject({
        method: 'POST',
        url: '/software-providers/create',
        headers: { ...auth, cookie: first.cookie },
        payload: { clientName: 'Second_Client' }
      })
      const cookie = cookiesFrom(second.headers) || first.cookie

      const secretOn = async (url) =>
        getElementText(
          documentOf((await getCredentialsPage(cookie, url)).result),
          'client-secret'
        )

      expect(await secretOn(first.response.headers.location)).toEqual(
        'new-client-secret'
      )
      expect(await secretOn(second.headers.location)).toEqual(
        'second-client-secret'
      )
    })
  })

  describe('When creating is switched off, as in production', () => {
    let offServer

    beforeAll(async () => {
      config.set('clientCredentials.createEnabled', false)
      offServer = await createServer()
      await offServer.initialize()
    })

    afterAll(async () => {
      config.set('clientCredentials.createEnabled', true)
      await offServer.stop({ timeout: 0 })
    })

    test('Should not show the "Create new credentials" button', async () => {
      clientSyncRespondsWith(200, [])

      const { result } = await offServer.inject({
        method: 'GET',
        url: '/software-providers',
        headers: auth
      })

      expect(
        documentOf(result).querySelector(
          '[data-testid="create-credentials-button"]'
        )
      ).toBeNull()
    })

    test.each([
      ['GET', '/software-providers/create'],
      ['POST', '/software-providers/create'],
      ['GET', '/software-providers/credentials/any-id']
    ])('Should not have %s %s', async (method, url) => {
      const { statusCode } = await offServer.inject({
        method,
        url,
        headers: auth,
        payload: method === 'POST' ? { clientName: 'Any_Name' } : undefined
      })

      expect(statusCode).toEqual(404)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  test('Should ask anyone not signed in to sign in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/software-providers/create'
    })

    expect(statusCode).toEqual(302)
    expect(headers.location).toEqual(
      '/login?redirectTo=%2Fsoftware-providers%2Fcreate'
    )
  })
})
