import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
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
  secrets: [
    { createdAt: '2024-03-01T10:00:00.000Z' },
    { createdAt: '2020-01-01T10:00:00.000Z' },
    { createdAt: '2022-06-15T10:00:00.000Z' }
  ]
}

async function getPage(server) {
  const { result, statusCode } = await server.inject({
    method: 'GET',
    url: `/software-providers/${clientId}`,
    headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
  })

  return { statusCode, document: new JSDOM(result).window.document }
}

function tableRows(document) {
  return [...document.querySelectorAll('tbody tr')].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim())
  )
}

describe('#clientCredentialsSoftwareProviderDetailController', () => {
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
    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title.trim()).toEqual(
      'Skipflow_Test - DWT admin portal'
    )
    expect(getElementText(document, 'app-heading-title')).toContain(
      'Skipflow_Test'
    )
  })

  test('Should list the secrets oldest first', async () => {
    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(tableRows(document).map(([generatedOn]) => generatedOn)).toEqual([
      '1 January 2020 at 10:00am',
      '15 June 2022 at 10:00am',
      '1 March 2024 at 10:00am'
    ])
  })

  test('Should only let the oldest secret be replaced, linking to the replace page', async () => {
    const { document } = await getPage(server)
    const links = [...document.querySelectorAll('tbody a')]

    expect(links).toHaveLength(1)
    expect(links[0].textContent.trim()).toEqual('Replace secret')
    expect(links[0].getAttribute('href')).toEqual(
      `/software-providers/${clientId}/replace`
    )
    // The link is in the first row, which is the oldest secret
    expect(links[0].closest('tr')).toEqual(document.querySelector('tbody tr'))
  })

  test.each([
    ['one secret', [{ createdAt: '2020-01-01T10:00:00.000Z' }]],
    ['no secrets', []]
  ])('Should not offer a replacement when there are %s', async (_, secrets) => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: statusCodes.ok,
      json: () => Promise.resolve({ ...clientCredentials, secrets })
    })

    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.querySelectorAll('tbody a')).toHaveLength(
      secrets.length ? 1 : 0
    )
  })

  test('Should show the error page when the client credentials cannot be fetched', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: statusCodes.internalServerError,
      statusText: 'Internal Server Error'
    })

    const { statusCode } = await getPage(server)

    expect(statusCode).toBe(statusCodes.internalServerError)
  })

  test('Should show the environment the portal is running in', async () => {
    const originalEnvironment = config.get('cdpEnvironment')
    config.set('cdpEnvironment', 'ext-test')

    try {
      const { document } = await getPage(server)

      expect(
        document.querySelector('.govuk-heading-m').textContent.trim()
      ).toEqual('Client secrets for External test environment')
    } finally {
      config.set('cdpEnvironment', originalEnvironment)
    }
  })
})
