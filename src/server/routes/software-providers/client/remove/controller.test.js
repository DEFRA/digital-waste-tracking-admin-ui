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

const twoSecrets = {
  clientId,
  clientName: 'Skipflow_Test',
  tenantServiceName: 'waste-movement-external-api',
  secrets: [
    { createdAt: '2024-03-01T10:00:00.000Z' },
    { createdAt: '2020-01-01T10:00:00.000Z' }
  ]
}

const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

describe('#removeClientCredentialsController', () => {
  let server
  let fetchMock

  function clientSyncRespondsWith({ credentials = twoSecrets, purge }) {
    fetchMock.mockImplementation((url, options) =>
      Promise.resolve(
        options?.method === 'POST'
          ? purge
          : {
              ok: true,
              status: statusCodes.ok,
              json: () => Promise.resolve(credentials)
            }
      )
    )
  }

  function getRemovePage() {
    return server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}/remove`,
      headers: auth
    })
  }

  function removeSecret() {
    return server.inject({
      method: 'POST',
      url: `/software-providers/${clientId}/remove`,
      headers: auth
    })
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    clientSyncRespondsWith({
      purge: { ok: true, status: statusCodes.noContent }
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

  test('Should ask before removing the older secret', async () => {
    const { result, statusCode } = await getRemovePage()
    const document = new JSDOM(result).window.document

    expect(statusCode).toEqual(statusCodes.ok)
    expect(document.title.trim()).toEqual(
      'Remove the client secret - DWT admin portal'
    )
    expect(getElementText(document, 'app-heading-title')).toEqual(
      'Are you sure you want to remove this secret?'
    )
    expect(getElementText(document, 'interruption-card-text')).toContain(
      'Skipflow_Test'
    )
    expect(getElementText(document, 'confirm-button')).toEqual(
      'Yes, remove secret'
    )
  })

  test('Should name the date of the secret being removed, not the newest one', async () => {
    const { result } = await getRemovePage()
    const text = getElementText(
      new JSDOM(result).window.document,
      'interruption-card-text'
    )

    // The older secret is the one removed, so its own date is shown
    expect(text).toContain('generated on 1 January 2020 at 10:00am')
    expect(text).not.toContain('1 March 2024')
  })

  test('Should send a client with fewer than two secrets back to its page', async () => {
    clientSyncRespondsWith({
      credentials: {
        ...twoSecrets,
        secrets: [{ createdAt: '2024-03-01T10:00:00.000Z' }]
      }
    })

    const { statusCode, headers } = await getRemovePage()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)
  })

  test('Should purge the older secret, then go back to the client page', async () => {
    const { statusCode, headers } = await removeSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)

    const [purgeUrl, purgeOptions] = fetchMock.mock.calls.find(
      ([, options]) => options?.method === 'POST'
    )
    expect(purgeUrl.pathname).toEqual(
      `/clients/waste-movement-external-api/${clientId}/purge`
    )
    expect(purgeOptions?.method).toEqual('POST')
  })

  test('Should show that the secret was removed, once', async () => {
    const { headers } = await removeSecret()
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: headers.location,
      headers: { ...auth, cookie: headers['set-cookie'].join('; ') }
    })
    const document = new JSDOM(result).window.document

    expect(statusCode).toEqual(statusCodes.ok)
    expect(getElementText(document, 'removed-secret-alert')).toContain(
      'The oldest secret for Skipflow_Test has been removed.'
    )
  })

  test('Should go to the list when the client has gone', async () => {
    clientSyncRespondsWith({
      purge: { ok: false, status: statusCodes.notFound }
    })

    const { statusCode, headers } = await removeSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(paths.softwareProviders)
  })

  test('Should display an alert when Client Sync reports a conflict', async () => {
    clientSyncRespondsWith({
      purge: {
        ok: false,
        status: statusCodes.conflict,
        statusText: 'Conflict'
      }
    })

    const { statusCode, headers } = await removeSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)

    const { result } = await server.inject({
      method: 'GET',
      url: headers.location,
      headers: { ...auth, cookie: headers['set-cookie'].join('; ') }
    })
    const alert = getElementText(
      new JSDOM(result).window.document,
      'conflicted-change-alert'
    )
    expect(alert).toContain('No secret was removed for Skipflow_Test')
    expect(alert).toContain('another client has its name')
  })

  test('Should show the error page when Client Sync refuses', async () => {
    clientSyncRespondsWith({
      purge: { ok: false, status: 400, statusText: 'Bad Request' }
    })

    const { statusCode } = await removeSecret()

    expect(statusCode).toEqual(statusCodes.internalServerError)
  })

  test('Should send the user back to check, when the outcome is unknown', async () => {
    clientSyncRespondsWith({
      purge: { ok: false, status: 502, statusText: 'Bad Gateway' }
    })

    const { statusCode, headers } = await removeSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)
  })
})
