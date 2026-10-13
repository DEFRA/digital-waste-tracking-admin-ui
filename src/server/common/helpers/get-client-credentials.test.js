import { getClientCredentials } from './get-client-credentials.js'
import { config } from '#/config/config.js'

describe('#getClientCredentials', () => {
  const clientCredentials = [
    {
      clientId: '1234567890abcdef1234567890',
      clientName: 'Test Client 1',
      tenantServiceName: 'waste-movement-external-api'
    }
  ]

  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(clientCredentials)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should request the client credentials for the configured service', async () => {
    const result = await getClientCredentials()

    expect(result).toEqual(clientCredentials)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api`
    )
    expect(options.method).toEqual('GET')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test('Should return no client credentials when the backend responds with 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    await expect(getClientCredentials()).resolves.toEqual([])
  })

  test('Should throw when the backend responds with another non-ok status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(getClientCredentials()).rejects.toThrow(
      'Failed to get client credentials: 500 Internal Server Error'
    )
  })
})
