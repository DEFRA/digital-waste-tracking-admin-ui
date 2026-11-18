import { createServer } from '#/server/server.js'
import { pageNames } from '#/server/common/constants/page-names.js'
import { metricNames } from '#/server/common/constants/metric-names.js'
import { signedInAs } from '#/test-helpers/signed-in.js'

describe('#requestContext', () => {
  let server
  let bindings
  let counter

  const inject = (url, auth) => server.inject({ method: 'GET', url, auth })

  beforeAll(async () => {
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

    // Signing in redirects to Entra ID, without looking it up first
    vi.spyOn(server.plugins['hapi-auth-oidc'].oidc, 'login').mockImplementation(
      (_request, h) => h.redirect('https://entra.example/authorize').takeover()
    )
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    bindings = undefined
  })

  test('Should add the signed-in user and page name to the request logger', async () => {
    await inject('/', signedInAs())

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
      signedInAs()
    )

    expect(bindings).toEqual(
      expect.objectContaining({
        page: { name: pageNames.wasteOrganisationsDownloadCsv },
        user: { id: 'test1', name: 'test1' }
      })
    )
  })

  test('Should record a page view against the signed-in user', async () => {
    await inject('/', signedInAs())

    expect(counter).toHaveBeenCalledWith(metricNames.pageViews, 1, {
      page: pageNames.home,
      user: 'test1'
    })
  })

  test('Should record a page view when the CSV is downloaded', async () => {
    await inject(
      '/reporting/waste-organisations?date-from-Day=09&date-from-Month=06&date-from-Year=2026&date-to-Day=10&date-to-Month=06&date-to-Year=2026&download=csv',
      signedInAs()
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
