import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const clientCredentials = [
  {
    clientName: 'Skipflow_Test',
    clientId: '1c847b52-9de6-4a03-b7f8-52c96e1d4a37',
    tenantServiceName: 'waste-movement-external-api'
  },
  {
    clientName: 'Greenlane_Digital_Test',
    clientId: '2f95e07b-4c86-41d3-9a72-58be6d10c9f4',
    tenantServiceName: 'waste-movement-external-api'
  },
  {
    clientName: 'Kerbside_Collect_Test',
    clientId: 'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
    tenantServiceName: 'waste-movement-external-api'
  }
]

const introText =
  'Manage the client credentials that software providers use to connect to the Digital Waste Tracking service.'

async function getPage(server) {
  const { result, statusCode } = await server.inject({
    method: 'GET',
    url: '/software-providers',
    headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
  })

  return { statusCode, document: new JSDOM(result).window.document }
}

function tableRows(document) {
  return [
    ...document.querySelectorAll('[data-testid="client-credentials"] tbody tr')
  ].map((row) =>
    [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim())
  )
}

describe('#softwareProvidersController', () => {
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

  test('Should show the page title, heading and text', async () => {
    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title.trim()).toEqual(
      'Software providers - DWT admin portal'
    )
    expect(getElementText(document, 'app-heading-title')).toEqual(
      'Software providers'
    )
    expect(getElementText(document, 'app-page-body')).toEqual(introText)
  })

  test('Should list the client credentials in a sortable table, sorted by client name', async () => {
    const { document } = await getPage(server)
    const table = document.querySelector('[data-testid="client-credentials"]')

    expect(table.getAttribute('data-module')).toEqual('moj-sortable-table')
    expect(table.querySelector('caption').textContent.trim()).toEqual(
      'Client credentials'
    )
    expect(
      [...table.querySelectorAll('thead th')].map((heading) => ({
        text: heading.textContent.trim(),
        scope: heading.getAttribute('scope'),
        ariaSort: heading.getAttribute('aria-sort')
      }))
    ).toEqual([
      { text: 'Client name', scope: 'col', ariaSort: 'ascending' },
      { text: 'Client ID', scope: 'col', ariaSort: 'none' },
      { text: 'Environment', scope: 'col', ariaSort: 'none' }
    ])
    expect(tableRows(document)).toEqual([
      [
        'Greenlane_Digital_Test',
        '2f95e07b-4c86-41d3-9a72-58be6d10c9f4',
        'local'
      ],
      [
        'Kerbside_Collect_Test',
        'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
        'local'
      ],
      ['Skipflow_Test', '1c847b52-9de6-4a03-b7f8-52c96e1d4a37', 'local']
    ])
  })

  test('Should put the table in a focusable, named region that scrolls on its own', async () => {
    const { document } = await getPage(server)
    const region = document.querySelector(
      '[data-testid="client-credentials-region"]'
    )

    expect(region.getAttribute('role')).toEqual('region')
    expect(region.getAttribute('aria-label')).toEqual('Client credentials')
    expect(region.getAttribute('tabindex')).toEqual('0')
    expect(region.classList).toContain('app-table-scroll')
    expect(
      region.querySelector('[data-testid="client-credentials"]')
    ).not.toBeNull()
  })

  test('Should sort by client name ignoring case, then by client ID, with a missing name first', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: statusCodes.ok,
      json: () =>
        Promise.resolve([
          { clientName: 'bravo', clientId: 'id-5' },
          { clientName: 'Alpha', clientId: 'id-4' },
          { clientName: '_x', clientId: 'id-3' },
          { clientName: 'Charlie', clientId: 'id-2' },
          { clientName: 'charlie', clientId: 'id-1' },
          { clientId: 'id-6' }
        ])
    })

    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(tableRows(document).map(([name, id]) => `${name}|${id}`)).toEqual([
      '|id-6',
      '_x|id-3',
      'Alpha|id-4',
      'bravo|id-5',
      'charlie|id-1',
      'Charlie|id-2'
    ])
  })

  test.each([
    ['dev', 'Dev'],
    ['test', 'Test'],
    ['perf-test', 'Performance test'],
    ['ext-test', 'External test'],
    ['prod', 'Production'],
    ['local', 'local']
  ])('Should show the %s environment as %s', async (cdpEnvironment, label) => {
    const originalEnvironment = config.get('cdpEnvironment')
    config.set('cdpEnvironment', cdpEnvironment)

    try {
      const { document } = await getPage(server)

      expect(
        tableRows(document).map(([_name, _id, environment]) => environment)
      ).toEqual([label, label, label])
    } finally {
      config.set('cdpEnvironment', originalEnvironment)
    }
  })

  test('Should show a message instead of the table when there are no client credentials', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: statusCodes.notFound,
      statusText: 'Not Found'
    })

    const { statusCode, document } = await getPage(server)

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.querySelector('table')).toBeNull()
    expect(
      getElementText(document, 'client-credentials-empty-heading')
    ).toEqual('Client credentials')
    expect(getElementText(document, 'client-credentials-empty')).toEqual(
      'New client credentials will be shown here.'
    )
  })

  test('Should mark the Software providers navigation link as the current page', async () => {
    const { document } = await getPage(server)
    const currentLink = document.querySelector('[aria-current="page"]')

    expect(currentLink.textContent.trim()).toEqual('Software providers')
    expect(currentLink.getAttribute('href')).toEqual('/software-providers')
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

  test('Should redirect to the login page without a basic auth credential', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/software-providers'
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toEqual('/login?redirectTo=%2Fsoftware-providers')
  })
})
