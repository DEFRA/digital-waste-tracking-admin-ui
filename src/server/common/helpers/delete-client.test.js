import { deleteClient, DeleteClientError } from './delete-client.js'
import { config } from '#/config/config.js'

describe('#deleteClient', () => {
  const clientId = '1234567890abcdef1234567890'

  let fetchMock

  function clientSyncRespondsWith(status, body) {
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'Status text',
      json: () =>
        body === undefined
          ? Promise.reject(new Error('No body'))
          : Promise.resolve(body)
    })
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    clientSyncRespondsWith(204)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should delete the client of the configured service', async () => {
    await expect(deleteClient(clientId)).resolves.toEqual({
      isNotFound: false
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}`
    )
    expect(options.method).toEqual('DELETE')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test("Should say when Client Sync doesn't have the client", async () => {
    clientSyncRespondsWith(404)

    await expect(deleteClient(clientId)).resolves.toEqual({
      isNotFound: true
    })
  })

  test.each([
    ['another client shares the name', 409, undefined, 'failure'],
    ['CDP refused', 502, { outcome: 'failure' }, 'failure'],
    ['the outcome is unknown', 502, { outcome: 'unknown' }, 'unknown'],
    ['a server error gives no outcome', 500, undefined, 'unknown']
  ])(
    'Should say whether the client was deleted when %s',
    async (_, status, body, outcome) => {
      clientSyncRespondsWith(status, body)

      const error = await deleteClient(clientId).catch((err) => err)

      expect(error).toBeInstanceOf(DeleteClientError)
      expect(error.outcome).toEqual(outcome)
    }
  )

  test('Should treat a failed request as an unknown outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const error = await deleteClient(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(DeleteClientError)
    expect(error.outcome).toEqual('unknown')
    expect(error.message).toEqual('Failed to delete client: fetch failed')
  })
})
