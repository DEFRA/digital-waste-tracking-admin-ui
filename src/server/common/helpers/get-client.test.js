import { getClient } from './get-client.js'
import { config } from '#/config/config.js'

describe('#getClient', () => {
  const client = {
    clientId: '1234567890abcdef1234567890',
    clientName: 'Test_Client_1',
    tenantServiceName: 'waste-movement-external-api'
  }

  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(client)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should get the client of the configured service', async () => {
    await expect(getClient(client.clientId)).resolves.toEqual(client)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${client.clientId}`
    )
    expect(options.method).toEqual('GET')
    expect(options.headers.Authorization).toMatch(/^Basic /)
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  test("Should return undefined when Client Sync doesn't have the client", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 })

    await expect(getClient(client.clientId)).resolves.toBeUndefined()
  })

  test('Should throw for any other failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(getClient(client.clientId)).rejects.toThrow(
      `Failed to get client ${client.clientId}: 500 Internal Server Error`
    )
  })
})
