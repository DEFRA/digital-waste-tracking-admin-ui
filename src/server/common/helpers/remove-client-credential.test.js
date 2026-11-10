import {
  removeClientCredential,
  RemoveClientCredentialError
} from './remove-client-credential.js'
import { config } from '#/config/config.js'

describe('#removeClientCredential', () => {
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

  test('Should purge the oldest secret of the client of the configured service', async () => {
    await expect(removeClientCredential(clientId)).resolves.toEqual({
      isNotFound: false
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}/purge`
    )
    expect(options.method).toEqual('POST')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test("Should say when Client Sync doesn't have the client", async () => {
    clientSyncRespondsWith(404)

    await expect(removeClientCredential(clientId)).resolves.toEqual({
      isNotFound: true
    })
  })

  test.each([
    ['CDP refused', 502, { outcome: 'failure' }, 'failure'],
    ['the outcome is unknown', 502, { outcome: 'unknown' }, 'unknown'],
    ['a server error gives no outcome', 500, undefined, 'unknown']
  ])(
    'Should say whether the secret was removed when %s',
    async (_, status, body, outcome) => {
      clientSyncRespondsWith(status, body)

      const error = await removeClientCredential(clientId).catch((err) => err)

      expect(error).toBeInstanceOf(RemoveClientCredentialError)
      expect(error.outcome).toEqual(outcome)
    }
  )

  test('Should treat a failed request as an unknown outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const error = await removeClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(RemoveClientCredentialError)
    expect(error.outcome).toEqual('unknown')
    expect(error.message).toEqual(
      'Failed to remove client credential: fetch failed'
    )
  })
})
