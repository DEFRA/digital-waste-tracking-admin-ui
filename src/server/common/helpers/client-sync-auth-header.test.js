import { WebIdentityTokenProvider } from '@defra/hapi-auth-oidc'

const mockGetCredentials = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-auth-oidc', () => ({
  WebIdentityTokenProvider: vi.fn(function () {
    this.getCredentials = mockGetCredentials
  })
}))

describe('#clientSyncAuthHeader', () => {
  let clientSyncAuthHeader
  let config

  beforeEach(async () => {
    // Fresh modules each time, as the helper caches its token provider. Its
    // config is fresh too, so it's imported here to set it
    vi.resetModules()
    clientSyncAuthHeader = (await import('./client-sync-auth-header.js'))
      .clientSyncAuthHeader
    config = (await import('#/config/config.js')).config
  })

  afterEach(() => {
    config.set('clientSyncAuth.stsAudience', null)
  })

  test('Should use basic auth when no STS audience is set', async () => {
    await expect(clientSyncAuthHeader()).resolves.toMatch(/^Basic /)
    expect(WebIdentityTokenProvider).not.toHaveBeenCalled()
  })

  describe('With an STS audience', () => {
    beforeEach(() => {
      config.set('clientSyncAuth.stsAudience', 'dwt-client-sync')
      mockGetCredentials.mockResolvedValue('a-token')
    })

    test('Should send an STS token for that audience, renewed before it expires', async () => {
      await expect(clientSyncAuthHeader()).resolves.toBe('Bearer a-token')
      expect(WebIdentityTokenProvider).toHaveBeenCalledWith({
        audience: ['dwt-client-sync'],
        earlyRefreshMs: 30_000
      })
    })

    test('Should reuse the token provider, which caches the token', async () => {
      await clientSyncAuthHeader()
      await clientSyncAuthHeader()

      expect(WebIdentityTokenProvider).toHaveBeenCalledTimes(1)
      expect(mockGetCredentials).toHaveBeenCalledTimes(2)
    })

    test('Should fail when STS gives no token', async () => {
      mockGetCredentials.mockResolvedValue(null)

      await expect(clientSyncAuthHeader()).rejects.toThrow(
        'Failed to get an STS token for DWT Client Sync'
      )
    })
  })
})
