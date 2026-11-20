import { createServer } from '#/server/server.js'
import { paths } from '#/server/common/constants/paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import { expectServiceErrorAlert } from '#/test-helpers/service-error-alert.js'
import { signedInAs } from '#/test-helpers/signed-in.js'

const { mockAuditWriteAction } = vi.hoisted(() => ({
  mockAuditWriteAction: vi.fn()
}))

vi.mock('#/server/common/helpers/audit-write-action.js', () => ({
  auditWriteAction: mockAuditWriteAction
}))

// Cognito client ids have no hyphens: only [\w+], which the route validates
const clientId = '1c847b529de64a03b7f852c96e1d4a37'

const client = {
  clientId,
  clientName: 'Skipflow_Test',
  tenantServiceName: 'waste-movement-external-api',
  secrets: [{ createdAt: '2020-01-01T10:00:00.000Z' }]
}

const rotated = { clientId, clientSecret: 'second-client-secret' }

const auth = signedInAs()

describe('Add another secret', () => {
  let server
  let fetchMock

  function clientSyncRespondsWith({ rotate, client: fetched = client }) {
    fetchMock.mockImplementation((url, options) =>
      Promise.resolve(
        options?.method === 'POST'
          ? rotate
          : {
              ok: true,
              status: statusCodes.ok,
              json: () => Promise.resolve(fetched)
            }
      )
    )
  }

  function addAnotherSecret() {
    return server.inject({
      method: 'POST',
      url: `/software-providers/${clientId}/add-secret`,
      auth
    })
  }

  async function getClientPage(headers) {
    const { result } = await server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}`,
      auth,
      headers: { cookie: headers['set-cookie'].join('; ') }
    })

    return new JSDOM(result).window.document
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    clientSyncRespondsWith({
      rotate: {
        ok: true,
        status: statusCodes.ok,
        json: () => Promise.resolve(rotated)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeAll(async () => {
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
    expect(mockAuditWriteAction).toHaveBeenCalledWith(expect.anything(), {
      action: 'added another client secret',
      outcome: 'success',
      client: { clientId, clientName: 'Skipflow_Test' }
    })
  })

  test('Should record a failed add when Client Sync refuses', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: 400, statusText: 'Bad Request' }
    })

    await addAnotherSecret()

    expect(mockAuditWriteAction).toHaveBeenCalledWith(expect.anything(), {
      action: 'added another client secret',
      outcome: 'failure',
      client: { clientId, clientName: 'Skipflow_Test' }
    })
  })

  test.each([
    [
      'the client is gone',
      { ok: false, status: statusCodes.notFound },
      'failure'
    ],
    [
      'the client cannot be rotated',
      { ok: false, status: statusCodes.conflict },
      'failure'
    ],
    ['the outcome is unknown', { ok: false, status: 502 }, 'unknown']
  ])('Should record the outcome when %s', async (_, rotate, outcome) => {
    clientSyncRespondsWith({
      rotate: { ...rotate, statusText: 'Status text' }
    })

    await addAnotherSecret()

    expect(mockAuditWriteAction).toHaveBeenCalledWith(expect.anything(), {
      action: 'added another client secret',
      outcome,
      client: { clientId, clientName: 'Skipflow_Test' }
    })
  })

  test('Should not audit a client it refuses to rotate', async () => {
    clientSyncRespondsWith({ client: { ...client, secrets: [{}, {}] } })

    await addAnotherSecret()

    expect(mockAuditWriteAction).not.toHaveBeenCalled()
  })

  test('Should show the new secret, once, and mark only the newest secret as New on first visit to the client page', async () => {
    const { headers } = await addAnotherSecret()

    const credentialsResponse = await server.inject({
      method: 'GET',
      url: headers.location,
      auth
    })

    expect(credentialsResponse.statusCode).toEqual(statusCodes.ok)
    const document = new JSDOM(credentialsResponse.result).window.document
    expect(getElementText(document, 'client-secret')).toEqual(
      rotated.clientSecret
    )
    const closeHref = document
      .querySelector('[data-testid="close-button"]')
      .getAttribute('href')
    // Close goes back to the client, where the new secret is listed
    expect(closeHref).toEqual(`/software-providers/${clientId}`)

    clientSyncRespondsWith({
      client: {
        ...client,
        secrets: [
          { createdAt: '2026-11-13T15:05:00.000Z' },
          { createdAt: '2020-01-01T10:00:00.000Z' }
        ]
      }
    })

    const cookie = credentialsResponse.headers['set-cookie']
      .map((value) => value.split(';')[0])
      .join('; ')
    const firstVisit = await server.inject({
      method: 'GET',
      url: closeHref,
      auth,
      headers: { cookie }
    })
    const firstClientPage = new JSDOM(firstVisit.result).window.document
    const [newestRow, olderRow] = [
      ...firstClientPage.querySelectorAll('tbody tr')
    ]

    const newest = newestRow.querySelector('td')
    const older = olderRow.querySelector('td')

    expect(newest.textContent.replace(/\s+/g, ' ').trim()).toEqual(
      '13 November 2026 at 3:05pm New'
    )
    expect(newest.querySelector('strong').textContent).toEqual('New')
    expect(older.textContent.replace(/\s+/g, ' ').trim()).toEqual(
      '1 January 2020 at 10:00am'
    )
    expect(older.querySelector('strong')).toBeNull()

    const nextCookie =
      firstVisit.headers['set-cookie']
        ?.map((value) => value.split(';')[0])
        .join('; ') ?? cookie
    const secondVisit = await server.inject({
      method: 'GET',
      url: closeHref,
      auth,
      headers: { cookie: nextCookie }
    })
    const secondClientPage = new JSDOM(secondVisit.result).window.document
    expect(secondClientPage.querySelector('tbody .govuk-tag')).toBeNull()
  })

  test('Should go to the list when the client is gone', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: statusCodes.notFound }
    })

    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(paths.softwareProviders)
  })

  test('Display an alert when Client Sync reports a conflict', async () => {
    clientSyncRespondsWith({
      rotate: {
        ok: false,
        status: statusCodes.conflict,
        statusText: 'Conflict'
      }
    })

    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)

    const alert = getElementText(
      await getClientPage(headers),
      'conflicted-change-alert'
    )
    expect(alert).toContain('No secret was added for Skipflow_Test')
    expect(alert).toContain('another client has its name')
  })

  test('Should show the error page, not the alert, when Client Sync says it happened', async () => {
    clientSyncRespondsWith({
      rotate: {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.resolve({ outcome: 'success' }),
        clone() {
          return this
        }
      }
    })

    const { statusCode } = await addAnotherSecret()

    // It happened, so saying "We have not" would be wrong
    expect(statusCode).toEqual(statusCodes.internalServerError)
  })

  test.each([
    [
      'refuses the request',
      { ok: false, status: 400, statusText: 'Bad Request' }
    ],
    [
      'says CDP refused',
      {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.resolve({ outcome: 'failure' }),
        clone() {
          return this
        }
      }
    ]
  ])(
    'Should show the software provider page with an alert when Client Sync %s',
    async (_, refusal) => {
      clientSyncRespondsWith({ rotate: refusal })

      const { statusCode, headers } = await addAnotherSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toEqual(`/software-providers/${clientId}`)
      // The refusal is known, so it's recorded as a failure, not unknown
      expect(mockAuditWriteAction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ outcome: 'failure' })
      )

      const shown = await server.inject({
        method: 'GET',
        url: headers.location,
        auth: signedInAs(),
        headers: { cookie: headers['set-cookie'].join('; ') }
      })
      expectServiceErrorAlert(
        new JSDOM(shown.result).window.document,
        'Try again. We have not added a secret.'
      )

      // Shown once, so not when the page is next opened
      const next = await server.inject({
        method: 'GET',
        url: headers.location,
        auth: signedInAs(),
        headers: {
          cookie:
            shown.headers['set-cookie']?.join('; ') ??
            headers['set-cookie'].join('; ')
        }
      })
      expect(
        new JSDOM(next.result).window.document.querySelector(
          '[data-testid="service-error-alert"]'
        )
      ).toBeNull()
    }
  )

  test('Should send the user back to check, when the outcome is unknown', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: 502, statusText: 'Bad Gateway' }
    })

    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)

    const document = await getClientPage(headers)
    const alert = getElementText(document, 'uncertain-change-alert')
    expect(alert).toContain('may have worked')
    expect(alert).toContain('before trying again')
    // It may have worked, so it mustn't say it didn't
    expect(
      document.querySelector('[data-testid="service-error-alert"]')
    ).toBeNull()
  })

  test.each([
    ['two secrets', [{}, {}]],
    ['no secrets', []],
    ['no secret details', undefined]
  ])(
    'Should not rotate when the client has %s, as CDP would drop the oldest',
    async (_, secrets) => {
      clientSyncRespondsWith({ client: { ...client, secrets } })

      const { statusCode, headers } = await addAnotherSecret()

      expect(statusCode).toEqual(statusCodes.found)
      expect(headers.location).toEqual(`/software-providers/${clientId}`)
      expect(
        fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')
      ).toHaveLength(0)
    }
  )
})
