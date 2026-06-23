import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { JSDOM } from 'jsdom'

describe('#homeController', () => {
  let server

  const getElementText = (document, dataTestId) =>
    document.querySelector(`[data-testid="${dataTestId}"]`).textContent.trim()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    const { document } = new JSDOM(result).window
    const pageTitle = getElementText(document, 'app-heading-title')
    const pageBody = getElementText(document, 'app-page-body')

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title).toEqual('Home | DWT Admin Portal')
    expect(pageTitle).toEqual('DWT Admin Portal')
    expect(pageBody).toEqual(
      'This site houses a collection of tools for the use of the Digital Waste Tracking service team to facilitate managing and monitoring the service.'
    )
  })
})
