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

  describe('environmentLinks', () => {
    test.each([
      ['prod', 'ADMIN_UI_PROD_URL', 'prod'],
      ['extTest', 'ADMIN_UI_EXT_TEST_URL', 'ext-test'],
      ['perfTest', 'ADMIN_UI_PERF_TEST_URL', 'perf-test'],
      ['test', 'ADMIN_UI_TEST_URL', 'test'],
      ['dev', 'ADMIN_UI_DEV_URL', 'dev']
    ])('Should configure the %s portal URL', async (key, env, environment) => {
      const config = await loadConfig({ [env]: undefined })

      expect(config.get(`environmentLinks.${key}`)).toEqual(
        `https://digital-waste-tracking-admin-ui.${environment}.cdp-int.defra.cloud`
      )
    })

    test.each([
      ['prod', 'ADMIN_UI_PROD_URL'],
      ['extTest', 'ADMIN_UI_EXT_TEST_URL'],
      ['perfTest', 'ADMIN_UI_PERF_TEST_URL', 'perf-test'],
      ['test', 'ADMIN_UI_TEST_URL', 'test'],
      ['dev', 'ADMIN_UI_DEV_URL', 'dev']
    ])('Should allow overriding the %s portal URL', async (key, env) => {
      const config = await loadConfig({ [env]: 'https://example.com' })

      expect(config.get(`environmentLinks.${key}`)).toEqual(
        'https://example.com'
      )
    })
  })

  describe('securityTeam', () => {
    test('Should email the security team, copying in the people CDP names', async () => {
      const config = await loadConfig({
        SECURITY_TEAM_EMAIL: undefined,
        SECURITY_TEAM_CC: undefined
      })

      expect(config.get('securityTeam')).toEqual({
        email: 'security.team@defra.gov.uk',
        cc: ['chris.knight@defra.gov.uk', 'steve.wilson@defra.gov.uk']
      })
    })

    test('Should ignore spaces and empty entries in who is copied in', async () => {
      const config = await loadConfig({
        SECURITY_TEAM_CC: ' one@defra.gov.uk , two@defra.gov.uk,'
      })

      expect(config.get('securityTeam.cc')).toEqual([
        'one@defra.gov.uk',
        'two@defra.gov.uk'
      ])
    })

    test.each([
      ['SECURITY_TEAM_EMAIL', 'security team'],
      ['SECURITY_TEAM_CC', 'one@defra.gov.uk,not an address']
    ])(
      'Should refuse a %s that is not an email address',
      async (name, value) => {
        await expect(loadConfig({ [name]: value })).rejects.toThrow(
          'must be an email address'
        )
      }
    )
  })
})
