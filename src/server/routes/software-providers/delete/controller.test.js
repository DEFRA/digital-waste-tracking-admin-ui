import { JSDOM } from 'jsdom'

import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const { mockAuditWriteAction } = vi.hoisted(() => ({
  mockAuditWriteAction: vi.fn()
}))

vi.mock('#/server/common/helpers/audit-write-action.js', () => ({
  auditWriteAction: mockAuditWriteAction
}))

const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

const client = {
  clientId: '1234567890abcdef1234567890',
  clientName: 'Kerbside_Collect_Test',
  tenantServiceName: 'waste-movement-external-api'
}

const deletePath = `/software-providers/${client.clientId}/delete`

function documentOf(result) {
  return new JSDOM(result).window.document
}

function cookiesFrom(headers) {
  return [headers['set-cookie']]
    .flat()
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Status text',
    json: () =>
      body === undefined
        ? Promise.reject(new Error('No body'))
        : Promise.resolve(body)
  }
}

describe('Delete a software provider', () => {
  let server
  let fetchMock
  // What Client Sync answers, by method
  let clientSync

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    clientSync = {
      GET: () => response(200, client),
      DELETE: () => response(204)
    }
    fetchMock = vi.fn((url, { method }) => {
      // The Software providers page lists every client
      if (
        method === 'GET' &&
        url.pathname.endsWith('/clients/waste-movement-external-api')
      ) {
        return Promise.resolve(response(200, []))
      }
      return Promise.resolve(clientSync[method]())
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const deleteCalls = () =>
    fetchMock.mock.calls.filter(([, { method }]) => method === 'DELETE')

  describe('Confirmation page', () => {
    test('Should ask to confirm, naming the client and the environment', async () => {
      const originalEnvironment = config.get('cdpEnvironment')
      config.set('cdpEnvironment', 'ext-test')

      try {
        const { statusCode, result } = await server.inject({
          method: 'GET',
          url: deletePath,
          headers: auth
        })
        const document = documentOf(result)

        expect(statusCode).toEqual(200)
        expect(document.title.trim()).toEqual(
          'Are you sure you want to delete the software provider? - DWT admin portal'
        )
        expect(document.querySelectorAll('h1')).toHaveLength(1)
        expect(getElementText(document, 'app-heading-title')).toEqual(
          'Are you sure you want to delete the software provider?'
        )
        expect(getElementText(document, 'interruption-card-text')).toEqual(
          'You will delete the entire record for Kerbside_Collect_Test, including all the credentials, in the external test environment only.'
        )
        expect(getElementText(document, 'confirm-button')).toEqual(
          'Yes, delete software provider'
        )
        expect(
          document
            .querySelector('[data-testid="back-link"]')
            .getAttribute('href')
        ).toEqual(`/software-providers/${client.clientId}`)
        expect(deleteCalls()).toHaveLength(0)
      } finally {
        config.set('cdpEnvironment', originalEnvironment)
      }
    })

    test('Should go to the Software providers page for a client that has been deleted', async () => {
      clientSync.GET = () => response(404)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: deletePath,
        headers: auth
      })

      expect(statusCode).toEqual(302)
      expect(headers.location).toEqual('/software-providers')
    })

    test.each(['GET', 'POST'])(
      'Should go to the Software providers page, without asking Client Sync, for an id that cannot be a client (%s)',
      async (method) => {
        const { statusCode, headers } = await server.inject({
          method,
          url: '/software-providers/not-an-id/delete',
          headers: auth
        })

        expect(statusCode).toEqual(302)
        expect(headers.location).toEqual('/software-providers')
        expect(fetchMock).not.toHaveBeenCalled()
      }
    )
  })

  describe('Deleting', () => {
    function confirm(cookie) {
      return server.inject({
        method: 'POST',
        url: deletePath,
        headers: { ...auth, ...(cookie && { cookie }) }
      })
    }

    function softwareProvidersPage(cookie) {
      return server.inject({
        method: 'GET',
        url: '/software-providers',
        headers: { ...auth, cookie }
      })
    }

    test('Should delete the client and say so on the Software providers page, once', async () => {
      const deleted = await confirm()

      expect(deleted.statusCode).toEqual(302)
      expect(deleted.headers.location).toEqual('/software-providers')
      expect(deleteCalls()).toHaveLength(1)
      expect(deleteCalls()[0][0].pathname).toEqual(
        `/clients/waste-movement-external-api/${client.clientId}`
      )

      const shown = await softwareProvidersPage(cookiesFrom(deleted.headers))
      const { result } = shown
      const document = documentOf(result)
      const alert = document.querySelector('[data-testid="deleted-alert"]')

      expect(alert.getAttribute('aria-label')).toEqual(
        'success: Software provider deleted'
      )
      expect(getElementText(document, 'alert-heading')).toEqual(
        'Software provider deleted'
      )
      expect(getElementText(document, 'alert-text')).toEqual(
        'Kerbside_Collect_Test has been deleted.'
      )
      // Above the H1
      expect(result.indexOf('data-testid="deleted-alert"')).toBeLessThan(
        result.indexOf('<h1')
      )

      // Showing it clears it from the session, which the cookie may hold
      expect(cookiesFrom(shown.headers)).not.toEqual('')
      const reloaded = documentOf(
        (await softwareProvidersPage(cookiesFrom(shown.headers))).result
      )
      expect(reloaded.querySelector('[data-testid="deleted-alert"]')).toBeNull()
    })

    test('Should record who deleted which client', async () => {
      await confirm()

      expect(mockAuditWriteAction).toHaveBeenCalledWith(expect.anything(), {
        action: 'deleted software provider',
        outcome: 'success',
        client: {
          clientId: client.clientId,
          clientName: client.clientName
        }
      })
    })

    test('Should go to the Software providers page, deleting nothing, for a client that has been deleted', async () => {
      clientSync.GET = () => response(404)

      const { statusCode, headers } = await confirm()

      expect(statusCode).toEqual(302)
      expect(headers.location).toEqual('/software-providers')
      expect(deleteCalls()).toHaveLength(0)
      expect(mockAuditWriteAction).not.toHaveBeenCalled()
    })

    test('Should go to the Software providers page, without an alert, when someone else deleted it first', async () => {
      clientSync.DELETE = () => response(404)

      const deleted = await confirm()
      const document = documentOf(
        (await softwareProvidersPage(cookiesFrom(deleted.headers))).result
      )

      expect(deleted.headers.location).toEqual('/software-providers')
      expect(document.querySelector('[data-testid="deleted-alert"]')).toBeNull()
      expect(mockAuditWriteAction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ outcome: 'failure' })
      )
    })

    test.each([
      [
        'refuses the request',
        () => response(502, { outcome: 'failure' }),
        'failure'
      ],
      [
        'refuses as another client shares the name',
        () => response(409),
        'failure'
      ],
      [
        'may have deleted it',
        () => response(502, { outcome: 'unknown' }),
        'unknown'
      ]
    ])(
      'Should show an error, recording the outcome, when Client Sync %s',
      async (_, deleteResponse, outcome) => {
        clientSync.DELETE = deleteResponse

        const { statusCode } = await confirm()

        expect(statusCode).toEqual(500)
        expect(mockAuditWriteAction).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ outcome })
        )
      }
    )
  })

  describe('When deleting is switched off, as in production', () => {
    let offServer

    beforeAll(async () => {
      config.set('clientCredentials.deleteEnabled', false)
      offServer = await createServer()
      await offServer.initialize()
    })

    afterAll(async () => {
      config.set('clientCredentials.deleteEnabled', true)
      await offServer.stop({ timeout: 0 })
    })

    test.each(['GET', 'POST'])(
      'Should not have the confirmation page (%s)',
      async (method) => {
        const { statusCode } = await offServer.inject({
          method,
          url: deletePath,
          headers: auth
        })

        expect(statusCode).toEqual(404)
        expect(deleteCalls()).toHaveLength(0)
      }
    )
  })

  test('Should ask anyone not signed in to sign in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: deletePath
    })

    expect(statusCode).toEqual(302)
    expect(headers.location).toMatch(/^\/login/)
  })
})
