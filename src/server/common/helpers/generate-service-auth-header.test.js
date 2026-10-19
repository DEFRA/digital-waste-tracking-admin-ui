import { generateServiceAuthHeader } from './generate-service-auth-header.js'
import { config } from '#/config/config.js'

describe('#generateServiceAuthHeader', () => {
  const originalPassword = config.get('serviceAuth.password')

  afterEach(() => {
    config.set('serviceAuth.password', originalPassword)
  })

  test('Should build a Basic auth header from the service credentials', () => {
    config.set('serviceAuth.password', 'a-password')

    const [scheme, encoded] = generateServiceAuthHeader().split(' ')

    expect(scheme).toEqual('Basic')
    expect(Buffer.from(encoded, 'base64').toString()).toEqual(
      `${config.get('serviceAuth.username')}:a-password`
    )
  })
})
