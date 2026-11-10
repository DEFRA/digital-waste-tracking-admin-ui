import { createServer } from '#/server/server.js'
import { paths } from '#/server/common/constants/paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const clientId = '1c847b529de64a03b7f852c96e1d4a37'

const clientCredentials = {
  clientId,
  clientName: 'Skipflow_Test',
  tenantServiceName: 'waste-movement-external-api',
  secrets: [{ createdAt: '2020-01-01T10:00:00.000Z' }]
}

describe('#replaceClientCredentialsController', () => {
  let server
  let fetchMock

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: statusCodes.ok,
      json: () => Promise.resolve(clientCredentials)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should show the page title', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}/replace`,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toBe(statusCodes.ok)
    const document = new JSDOM(result).window.document
    expect(document.title.trim()).toEqual(
      'Replace the client secret - DWT admin portal'
    )
    expect(getElementText(document, 'app-heading-title')).toEqual(
      'Are you sure you want to replace the current secret?'
    )
    expect(getElementText(document, 'interruption-card-text')).toContain(
      'The current secret for Skipflow_Test will stop working'
    )
  })

  test('Should show the error page when the client credentials cannot be fetched', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: statusCodes.internalServerError,
      statusText: 'Internal Server Error'
    })

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}/replace`,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
  })

  describe('Replacing the secret', () => {
    const rotated = { clientId, clientSecret: 'rotated-client-secret' }

    /**
     * Client Sync answers the GET for the client and its secrets, and then the
     * POST that rotates them
     */
    function clientSyncRespondsWith({ rotate: rotateResponse }) {
      fetchMock.mockImplementation((url, options) =>
        Promise.resolve(
          options?.method === 'POST'
            ? rotateResponse
            : {
                ok: true,
                status: statusCodes.ok,
                json: () => Promise.resolve(clientCredentials)
              }
        )
      )
    }

    function replaceSecret() {
      return server.inject({
        method: 'POST',
        url: `/software-providers/${clientId}/replace`,
        headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
      })
    }

    beforeEach(() => {
      clientSyncRespondsWith({
        rotate: {
          ok: true,
          status: statusCodes.ok,
          json: () => Promise.resolve(rotated)
        }
      })
    })

    test('Should rotate the secret and go to the new credentials page', async () => {
      const { statusCode, headers } = await replaceSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toMatch(
        /^\/software-providers\/credentials\/[0-9a-f-]{36}$/
      )
      const [replaceUrl, replaceOptions] = fetchMock.mock.calls.find(
        ([, options]) => options?.method === 'POST'
      )

      expect(replaceUrl.pathname).toEqual(
        `/clients/waste-movement-external-api/${clientId}/replace`
      )
      expect(replaceOptions?.method).toEqual('POST')
    })

    test('Should show the new secret, even when the old one may still work', async () => {
      clientSyncRespondsWith({
        rotate: {
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          json: () => Promise.resolve({ ...rotated, outcome: 'failure' })
        }
      })

      const { statusCode, headers } = await replaceSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toMatch(
        /^\/software-providers\/credentials\/[0-9a-f-]{36}$/
      )
    })

    test('Should go back to the client when the secret cannot be replaced', async () => {
      clientSyncRespondsWith({
        rotate: {
          ok: false,
          status: statusCodes.conflict,
          statusText: 'Conflict'
        }
      })

      const { statusCode, headers } = await replaceSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toEqual(`/software-providers/${clientId}`)
    })

    test('Should show the new secret, once', async () => {
      const { headers } = await replaceSecret()
      const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: headers.location,
        headers: auth
      })

      expect(statusCode).toEqual(statusCodes.ok)
      expect(
        getElementText(new JSDOM(result).window.document, 'client-secret')
      ).toEqual(rotated.clientSecret)

      // Shown once: coming back goes to the Software providers page
      const again = await server.inject({
        method: 'GET',
        url: headers.location,
        headers: auth
      })
      expect(again.statusCode).toEqual(statusCodes.found)
      expect(again.headers.location).toEqual(paths.softwareProviders)
    })

    test('Should go to the Software providers page when the client is gone', async () => {
      clientSyncRespondsWith({
        rotate: { ok: false, status: statusCodes.notFound }
      })

      const { statusCode, headers } = await replaceSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toEqual(paths.softwareProviders)
      // Nothing was rotated, so there are no new credentials to show
      expect(headers['set-cookie'] ?? '').not.toContain(rotated.clientSecret)
    })

    test.each([
      ['Client Sync refuses', 400],
      ['the outcome is unknown', 502]
    ])('Should show the error page when %s', async (_, status) => {
      clientSyncRespondsWith({
        rotate: { ok: false, status, statusText: 'Status text' }
      })

      const { statusCode } = await replaceSecret()

      expect(statusCode).toEqual(statusCodes.internalServerError)
    })
  })
})
