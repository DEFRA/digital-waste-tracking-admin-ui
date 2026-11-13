import { createServer } from '#/server/server.js'
import { paths } from '#/server/common/constants/paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
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

// Cognito client ids have no hyphens: only [\w+], which the route validates
const clientId = '1c847b529de64a03b7f852c96e1d4a37'

const client = {
  clientId,
  clientName: 'Skipflow_Test',
  tenantServiceName: 'waste-movement-external-api',
  secrets: [{ createdAt: '2020-01-01T10:00:00.000Z' }]
}

const rotated = { clientId, clientSecret: 'second-client-secret' }

const auth = { Authorization: `Basic ${requestBasicAuthTest1}` }

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
      headers: auth
    })
  }

  async function getClientPage(headers) {
    const { result } = await server.inject({
      method: 'GET',
      url: `/software-providers/${clientId}`,
      headers: { ...auth, cookie: headers['set-cookie'].join('; ') }
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
      headers: auth
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
      headers: { ...auth, cookie }
    })
    const firstClientPage = new JSDOM(firstVisit.result).window.document
    const [newestRow, olderRow] = [
      ...firstClientPage.querySelectorAll('tbody tr')
    ]

    expect(newestRow.querySelector('td').outerHTML).toEqual(
      '<td class="govuk-table__cell">13 November 2026 at 3:05pm\n<strong class="govuk-tag govuk-tag--green">New</strong>\n</td>'
    )
    expect(olderRow.querySelector('td').outerHTML).toEqual(
      '<td class="govuk-table__cell">1 January 2020 at 10:00am</td>'
    )

    const nextCookie =
      firstVisit.headers['set-cookie']
        ?.map((value) => value.split(';')[0])
        .join('; ') ?? cookie
    const secondVisit = await server.inject({
      method: 'GET',
      url: closeHref,
      headers: { ...auth, cookie: nextCookie }
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

  test('Should show the error page when Client Sync refuses', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: 400, statusText: 'Bad Request' }
    })

    const { statusCode } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.internalServerError)
  })

  test('Should send the user back to check, when the outcome is unknown', async () => {
    clientSyncRespondsWith({
      rotate: { ok: false, status: 502, statusText: 'Bad Gateway' }
    })

    const { statusCode, headers } = await addAnotherSecret()

    expect(statusCode).toEqual(statusCodes.found)
    expect(headers.location).toEqual(`/software-providers/${clientId}`)

    const alert = getElementText(
      await getClientPage(headers),
      'uncertain-change-alert'
    )
    expect(alert).toContain('may have worked')
    expect(alert).toContain('before trying again')
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
