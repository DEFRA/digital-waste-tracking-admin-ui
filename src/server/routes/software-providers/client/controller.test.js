import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
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
  secrets: [
    { createdAt: '2024-03-01T10:00:00.000Z' },
    { createdAt: '2020-01-01T10:00:00.000Z' }
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
    expect(document.title.trim()).toEqual('Skipflow_Test - DWT admin portal')
    expect(getElementText(document, 'app-heading-title')).toContain(
      'Skipflow_Test'
    )
  })

  test('Should list the secrets youngest first', async () => {
    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(tableRows(document).map(([generatedOn]) => generatedOn)).toEqual([
      '1 March 2024 at 10:00am',
      '1 January 2020 at 10:00am'
    ])
  })

  describe('With two secrets', () => {
    test('Should only let the older secret be removed, and offer no replacement', async () => {
      const { document } = await getPage(server)
      const [newest, older] = [...document.querySelectorAll('tbody tr')]
      const links = [...document.querySelectorAll('tbody a')]

      expect(links).toHaveLength(1)
      expect(links[0].textContent.trim()).toEqual('Remove secret')
      expect(links[0].getAttribute('href')).toEqual(
        `/software-providers/${clientId}/remove`
      )
      expect(newest.textContent).toContain('1 March 2024')
      expect(older.textContent).toContain('1 January 2020')
      expect(older.querySelectorAll('a')).toHaveLength(1)
      expect(newest.querySelectorAll('a')).toHaveLength(0)
      expect(
        document.querySelector('[data-testid="add-another-secret"]')
      ).toBeNull()
    })
  })

  describe('With one secret', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: statusCodes.ok,
        json: () =>
          Promise.resolve({
            ...clientCredentials,
            secrets: [{ createdAt: '2020-01-01T10:00:00.000Z' }]
          })
      })
    })

    test('Should let the secret be replaced, and offer another', async () => {
      const { document } = await getPage(server)
      const links = [...document.querySelectorAll('tbody a')]

      expect(links).toHaveLength(1)
      expect(links[0].textContent.trim()).toEqual('Replace secret')
      expect(links[0].getAttribute('href')).toEqual(
        `/software-providers/${clientId}/replace`
      )

      const addAnother = document.querySelector(
        '[data-testid="add-another-secret"]'
      )
      expect(addAnother.textContent.trim()).toEqual('Add another secret')
      // It submits straight to the new secret, as there's nothing to confirm
      expect(addAnother.tagName).toEqual('BUTTON')
      expect(addAnother.closest('form').getAttribute('action')).toEqual(
        `/software-providers/${clientId}/add-secret`
      )
      expect(addAnother.closest('form').getAttribute('method')).toEqual('post')
    })
  })

  describe('Deleting the software provider', () => {
    test('Should link to the delete page', async () => {
      const { document } = await getPage(server)
      const link = document.querySelector(
        '[data-testid="delete-software-provider"]'
      )

      expect(link.textContent.trim()).toEqual('Delete software provider')
      expect(link.getAttribute('href')).toEqual(
        `/software-providers/${clientId}/delete`
      )
    })

    test('Should not offer deleting when it is switched off', async () => {
      const original = config.get('clientCredentials.deleteEnabled')
      config.set('clientCredentials.deleteEnabled', false)

      try {
        const { document } = await getPage(server)

        expect(
          document.querySelector('[data-testid="delete-software-provider"]')
        ).toBeNull()
      } finally {
        config.set('clientCredentials.deleteEnabled', original)
      }
    })
  })

  test('Should not offer a removal when there are no secrets', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: statusCodes.ok,
      json: () => Promise.resolve({ ...clientCredentials, secrets: [] })
    })

    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.querySelectorAll('tbody a')).toHaveLength(0)
    expect(
      document.querySelector('[data-testid="add-another-secret"]')
    ).toBeNull()
  })

  test('Should go to the list when the client has gone', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: statusCodes.notFound,
      statusText: 'Not Found'
    })

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}`,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual('/software-providers')
  })

  test.each([
    ['not a client id', 'not-a-client-id'],
    ['using other characters', 'client%20id']
  ])('Should go to the list when the id is %s', async (_, id) => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/software-providers/${id}`,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual('/software-providers')
    expect(fetchMock).not.toHaveBeenCalled()
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

  describe('When changing secrets is switched off, as in production', () => {
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

    test.each([
      ['one secret', [{ createdAt: '2020-01-01T10:00:00.000Z' }]],
      [
        'two secrets',
        [
          { createdAt: '2024-03-01T10:00:00.000Z' },
          { createdAt: '2020-01-01T10:00:00.000Z' }
        ]
      ]
    ])(
      'Should show no controls for changing secrets, with %s',
      async (_, secrets) => {
        fetchMock.mockResolvedValue({
          ok: true,
          status: statusCodes.ok,
          json: () => Promise.resolve({ ...clientCredentials, secrets })
        })

        const { statusCode, document } = await getPage(offServer)

        expect(statusCode).toEqual(statusCodes.ok)
        expect(document.querySelectorAll('tbody a')).toHaveLength(0)
        expect(
          document.querySelector('[data-testid="add-another-secret"]')
        ).toBeNull()
        expect(document.body.textContent).not.toContain('Replace secret')
        expect(document.body.textContent).not.toContain('Remove secret')
      }
    )

    test.each([
      ['GET', `/software-providers/${clientId}/replace`],
      ['POST', `/software-providers/${clientId}/replace`],
      ['GET', `/software-providers/${clientId}/remove`],
      ['POST', `/software-providers/${clientId}/remove`],
      ['POST', `/software-providers/${clientId}/add-secret`]
    ])('Should not have %s %s', async (method, url) => {
      const { statusCode } = await offServer.inject({
        method,
        url,
        headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
      })

      expect(statusCode).toEqual(statusCodes.notFound)
    })
  })
})
