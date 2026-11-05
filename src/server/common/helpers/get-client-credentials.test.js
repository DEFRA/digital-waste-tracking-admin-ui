import { getClientCredentials, getClientCredentialsById } from './get-client-credentials.js'
import { config } from '#/config/config.js'

const mockLoggerWarn = vi.fn()

vi.mock('./logging/logger.js', () => ({
  createLogger: () => ({
    warn: (...args) => mockLoggerWarn(...args)
  })
}))

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
    mockLoggerWarn.mockClear()
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
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  test('Should authenticate as the portal with the service credentials', async () => {
    await getClientCredentials()

    const [_url, { headers }] = fetchMock.mock.calls[0]
    const [scheme, encoded] = headers.Authorization.split(' ')

    expect(scheme).toEqual('Basic')
    expect(Buffer.from(encoded, 'base64').toString()).toEqual(
      `${config.get('serviceAuth.username')}:${config.get('serviceAuth.password')}`
    )
  })

  test('Should return no client credentials when the backend responds with 404', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    await expect(getClientCredentials()).resolves.toEqual([])
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      `No client credentials found for waste-movement-external-api at ${config.get('services.clientSync')}/clients/waste-movement-external-api, showing none`
    )
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

  test('Should throw when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(getClientCredentials()).rejects.toThrow('fetch failed')
  })
})

describe('#getClientCredentialsById', () => {
  const clientId = '1234567890abcdef1234567890'

  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ clientId }])
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockLoggerWarn.mockClear()
  })

  test('Should request the client credentials for the given client', async () => {
    const result = await getClientCredentialsById(clientId)

    expect(result).toEqual([{ clientId }])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}`
    )
    expect(options.method).toEqual('GET')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  test('Should authenticate as the portal with the service credentials', async () => {
    await getClientCredentialsById(clientId)

    const [_url, { headers }] = fetchMock.mock.calls[0]
    const [scheme, encoded] = headers.Authorization.split(' ')

    expect(scheme).toEqual('Basic')
    expect(Buffer.from(encoded, 'base64').toString()).toEqual(
      `${config.get('serviceAuth.username')}:${config.get('serviceAuth.password')}`
    )
  })

  test('Should treat an unknown client ID as not found and return undefined', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    await expect(getClientCredentialsById(clientId)).resolves.toBeUndefined()
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      `Client '${clientId}' not found for tenant service 'waste-movement-external-api' at ${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}, showing none`
    )
  })

  test('Should throw when the backend responds with another non-ok status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(getClientCredentialsById(clientId)).rejects.toThrow(
      'Failed to get client credentials: 500 Internal Server Error'
    )
  })

  test('Should throw when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(getClientCredentialsById(clientId)).rejects.toThrow(
      'fetch failed'
    )
  })
})
