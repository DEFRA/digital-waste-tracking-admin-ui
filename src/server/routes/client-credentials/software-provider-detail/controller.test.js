import { createServer } from '#/server/server.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

describe('#clientCredentialsSoftwareProviderDetailController', () => {
  let server

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should show the page title', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/client-credentials/1c847b52-9de6-4a03-b7f8-52c96e1d4a37/software-provider-detail',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toBe(200)
    const document = new JSDOM(result).window.document
    expect(getElementText(document, 'app-heading-title')).toContain(
      'Client credentials: Software provider detail'
    )
  })
})
