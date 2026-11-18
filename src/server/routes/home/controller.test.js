import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import { signedInAs } from '../../../../test-helpers/signed-in.js'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide successful response when given a basic auth credential', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: signedInAs()
    })

    const { document } = new JSDOM(result).window
    const pageTitle = getElementText(document, 'app-heading-title')
    const pageBody = getElementText(document, 'app-page-body')

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title).toEqual('Home - DWT admin portal')
    expect(pageTitle).toEqual('DWT admin portal')
    expect(pageBody).toEqual(
      'This site houses a collection of tools for the use of the Digital Waste Tracking service team to facilitate managing and monitoring the service.'
    )
  })

  test('Should provide successful response when given a different basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: signedInAs('test2')
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should provide failed response when not given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
