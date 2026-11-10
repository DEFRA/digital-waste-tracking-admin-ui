describe('#config', () => {
  const originalEnv = { ...process.env }

  async function loadConfig(env) {
    vi.resetModules()
    process.env = { ...originalEnv, ...env }

    return (await import('./config.js')).config
  }

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('clientCredentials.createEnabled', () => {
    test.each([
      ['local', true],
      ['dev', true],
      ['test', true],
      ['perf-test', true],
      ['ext-test', true],
      ['prod', false]
    ])('Should be set for %s to %s', async (environment, enabled) => {
      const config = await loadConfig({
        ENVIRONMENT: environment,
        CLIENT_CREDENTIALS_CREATE_ENABLED: undefined
      })

      expect(config.get('clientCredentials.createEnabled')).toBe(enabled)
    })

    test('Should be overridable', async () => {
      const config = await loadConfig({
        ENVIRONMENT: 'prod',
        CLIENT_CREDENTIALS_CREATE_ENABLED: 'true'
      })

      expect(config.get('clientCredentials.createEnabled')).toBe(true)
    })
  })

  describe('clientCredentials.apiUrl', () => {
    test.each([
      ['local', 'http://localhost:3001'],
      [
        'dev',
        'https://waste-movement-external-api.api.dev.cdp-int.defra.cloud'
      ],
      [
        'test',
        'https://waste-movement-external-api.api.test.cdp-int.defra.cloud'
      ],
      [
        'perf-test',
        'https://waste-movement-external-api.api.perf-test.cdp-int.defra.cloud'
      ],
      [
        'ext-test',
        'https://waste-movement-external-api.api.ext-test.cdp-int.defra.cloud'
      ],
      ['prod', 'https://waste-tracking.api.defra.gov.uk']
    ])(
      'Should be the external API address for %s',
      async (environment, url) => {
        const config = await loadConfig({
          ENVIRONMENT: environment,
          CLIENT_CREDENTIALS_API_URL: undefined
        })

        expect(config.get('clientCredentials.apiUrl')).toEqual(url)
      }
    )

    test('Should be overridable', async () => {
      const config = await loadConfig({
        ENVIRONMENT: 'dev',
        CLIENT_CREDENTIALS_API_URL: 'https://example.com'
      })

      expect(config.get('clientCredentials.apiUrl')).toEqual(
        'https://example.com'
      )
    })
  })

  describe('auth', () => {
    test('Should default to entra auth mode', async () => {
      const config = await loadConfig({ AUTH_MODE: undefined })

      expect(config.get('auth.mode')).toBe('entra')
    })

    test('Should allow basic auth mode to be enabled by environment variable', async () => {
      const config = await loadConfig({ AUTH_MODE: 'basic' })

      expect(config.get('auth.mode')).toBe('basic')
    })

    test('Should map OIDC auth values from environment variables', async () => {
      const config = await loadConfig({
        ENTRA_ID_CLIENT_ID: 'client-1',
        OIDC_CLIENT_SECRET: 'local-secret',
        OIDC_TOKEN_ENDPOINT_AUTH_METHOD: 'client_secret_post',
        ENTRA_ID_OIDC_DISCOVERY_URI:
          'https://login.microsoftonline.com/tenant/v2.0/.well-known/openid-configuration',
        OIDC_LOGIN_CALLBACK_URI: '/auth/callback',
        APP_BASE_URL: 'https://example.com',
        OIDC_RESPONSE_MODE: 'form_post',
        ENTRA_ID_SCOPES: 'openid profile email user.read'
      })

      expect(config.get('auth.oidc.clientId')).toBe('client-1')
      expect(config.get('auth.oidc.clientSecret')).toBe('local-secret')
      expect(config.get('auth.oidc.tokenEndpointAuthMethod')).toBe(
        'client_secret_post'
      )
      expect(config.get('auth.oidc.discoveryUri')).toBe(
        'https://login.microsoftonline.com/tenant/v2.0/.well-known/openid-configuration'
      )
      expect(config.get('auth.oidc.loginCallbackUri')).toBe('/auth/callback')
      expect(config.get('auth.oidc.externalBaseUrl')).toBe('https://example.com')
      expect(config.get('auth.oidc.responseMode')).toBe('form_post')
      expect(config.get('auth.oidc.scope')).toBe('openid profile email user.read')
    })

    test('Should map federated credentials values from environment variables', async () => {
      const config = await loadConfig({
        FEDERATED_CREDENTIALS_PROVIDER: 'web-identity',
        FEDERATED_CREDENTIALS_ENABLE_MOCKING: 'false',
        FEDERATED_CREDENTIALS_AUDIENCE: 'api://app-id/.default'
      })

      expect(config.get('auth.federatedCredentials.provider')).toBe('web-identity')
      expect(config.get('auth.federatedCredentials.enableMocking')).toBe(false)
      expect(config.get('auth.federatedCredentials.audience')).toBe(
        'api://app-id/.default'
      )
    })
  })
})
