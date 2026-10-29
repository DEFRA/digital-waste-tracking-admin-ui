import { createServer } from '#/server/server.js'
import { pageNames } from '#/server/common/constants/page-names.js'
import { metricNames } from '#/server/common/constants/metric-names.js'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

describe('#requestContext', () => {
  let server
  let bindings
  let counter

  const inject = (url, headers = {}) =>
    server.inject({ method: 'GET', url, headers })

  const authHeaders = {
    Authorization: `Basic ${requestBasicAuthTest1}`
  }

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()

    // Capture the request logger bindings the same way hapi-pino reads them
    // when it logs the completed request
    server.ext('onPreResponse', (request, h) => {
      bindings = request.logger.bindings?.()
      return h.continue
    })

    // `request.metrics` and `server.metrics` are decorated with the same
    // instance, so this intercepts the counter the plugin calls
    counter = vi.spyOn(server.metrics, 'counter').mockResolvedValue()

    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    bindings = undefined
  })

  test('Should add the Basic Auth user and page name to the request logger', async () => {
    await inject('/', authHeaders)

    expect(bindings).toEqual(
      expect.objectContaining({
        page: { name: pageNames.home },
        user: { id: 'test1', name: 'test1' }
      })
    )
  })

  test('Should add the download CSV page name when downloading the results', async () => {
    await inject(
      '/reporting/waste-organisations?date-from-Day=09&date-from-Month=06&date-from-Year=2026&date-to-Day=10&date-to-Month=06&date-to-Year=2026&download=csv',
      authHeaders
    )

    expect(bindings).toEqual(
      expect.objectContaining({
        page: { name: pageNames.wasteOrganisationsDownloadCsv },
        user: { id: 'test1', name: 'test1' }
      })
    )
  })

  test('Should add the Basic Auth user when authenticated by the dwtAuth cookie', async () => {
    const [username, password] = Buffer.from(requestBasicAuthTest1, 'base64')
      .toString()
      .split(':')

    const login = await server.inject({
      method: 'POST',
      url: '/login',
      payload: { username, password, redirectTo: '/' }
    })

    const [dwtAuth] = login.headers['set-cookie']

    await inject('/', { Cookie: dwtAuth.split(';')[0] })

    expect(bindings).toEqual(
      expect.objectContaining({
        page: { name: pageNames.home },
        user: { id: 'test1', name: 'test1' }
      })
    )
  })

  test('Should record a page view against the Basic Auth user', async () => {
    await inject('/', authHeaders)

    expect(counter).toHaveBeenCalledWith(metricNames.pageViews, 1, {
      page: pageNames.home,
      user: 'test1'
    })
  })

  test('Should record a page view when the CSV is downloaded', async () => {
    await inject(
      '/reporting/waste-organisations?date-from-Day=09&date-from-Month=06&date-from-Year=2026&date-to-Day=10&date-to-Month=06&date-to-Year=2026&download=csv',
      authHeaders
    )

    expect(counter).toHaveBeenCalledWith(metricNames.pageViews, 1, {
      page: pageNames.wasteOrganisationsDownloadCsv,
      user: 'test1'
    })
  })

  test('Should not add a page name or record a page view for an untracked path', async () => {
    await inject('/login')

    expect(bindings.page).toBeUndefined()
    expect(bindings.user).toBeUndefined()
    expect(counter).not.toHaveBeenCalled()
  })

  test('Should not error for a path excluded from logging', async () => {
    const resp = await inject('/health')

    expect(resp.statusCode).toEqual(200)
    expect(bindings).toBeUndefined()
  })
})
