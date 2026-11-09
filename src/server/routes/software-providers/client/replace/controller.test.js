import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const clientId = '1c847b52-9de6-4a03-b7f8-52c96e1d4a37'

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
    expect(getElementText(document, 'app-heading-title')).toContain(
      'Skipflow_Test'
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
})
