import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signedInAs } from '../../../../test-helpers/signed-in.js'

describe('#reportingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide successful response when given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting',
      auth: signedInAs()
    })

    expect(statusCode).toBe(302)
  })

  test('Should provide failed response when not given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
