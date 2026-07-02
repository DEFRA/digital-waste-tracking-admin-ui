import { createServer } from '#/server/server.js'

describe('#reportingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting'
    })

    expect(statusCode).toBe(302)
  })
})
