import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1,
  requestBasicAuthTest2,
  userBasicAuthTest2
} from '../../../../test-helpers/constants.js'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1
    process.env.USER_BASIC_AUTH_TEST2 = userBasicAuthTest2

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
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
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

  test('Should provide successful response when given a different basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      headers: { Authorization: `Basic ${requestBasicAuthTest2}` }
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should provide failed response when not given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.unauthorized)
  })
})
