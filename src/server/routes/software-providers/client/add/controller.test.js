import { createServer } from '#/server/server.js'
import { paths } from '#/server/common/constants/paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

// Cognito client ids have no hyphens: only [\w+], which the route validates
const clientId = '1c847b529de64a03b7f852c96e1d4a37'

const client = {
  clientId,
  clientName: 'Skipflow_Test',
  tenantServiceName: 'waste-movement-external-api'
}

const rotated = { clientId, clientSecret: 'second-client-secret' }

const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

describe('Add another secret', () => {
  let server
  let fetchMock

  function clientSyncRespondsWith({ rotate }) {
    fetchMock.mockImplementation((url, options) =>
      Promise.resolve(
        options?.method === 'POST'
          ? rotate
          : { ok: true, status: statusCodes.ok, json: () => Promise.resolve(client) }
      )
    )
  }

  function addAnotherSecret() {
    return server.inject({
      method: 'POST',
      url: `/software-providers/${clientId}/add-secret`,
      headers: auth
    })
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    clientSyncRespondsWith({
      rotate: { ok: true, status: statusCodes.ok, json: () => Promise.resolve(rotated) }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should rotate the secret and go straight to the new credentials page', async () => {
    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    // No interstitial: the existing secret keeps working
    expect(headers.location).toMatch(
      /^\/software-providers\/credentials\/[0-9a-f-]{36}$/
    )

    const [rotateUrl, rotateOptions] = fetchMock.mock.calls.find(
      ([, options]) => options?.method === 'POST'
    )
    expect(rotateUrl.pathname).toEqual(
      `/clients/waste-movement-external-api/${clientId}/rotate`
    )
    expect(rotateOptions?.method).toEqual('POST')
  })

  test('Should show the new secret, once', async () => {
    const { headers } = await addAnotherSecret()

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: headers.location,
      headers: auth
    })

    expect(statusCode).toEqual(statusCodes.ok)
    expect(
      getElementText(new JSDOM(result).window.document, 'client-secret')
    ).toEqual(rotated.clientSecret)
  })

  test('Should go to the list when the client is gone', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: statusCodes.notFound }
    })

    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(paths.softwareProviders)
  })

  test.each([
    ['Client Sync refuses', 400],
    ['the outcome is unknown', 502]
  ])('Should show the error page when %s', async (_, status) => {
    clientSyncRespondsWith({
      rotate: { ok: false, status, statusText: 'Status text' }
    })

    const { statusCode } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.internalServerError)
  })
})
