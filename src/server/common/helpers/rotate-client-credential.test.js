import {
  rotateClientCredential,
  RotateClientCredentialError
} from './rotate-client-credential.js'
import { config } from '#/config/config.js'

describe('#rotateClientCredential', () => {
  const clientId = '1234567890abcdef1234567890'
  const rotated = { clientId, clientSecret: 'new-client-secret' }

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
    clientSyncRespondsWith(200, rotated)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should rotate the secret of the client of the configured service', async () => {
    await expect(rotateClientCredential(clientId)).resolves.toEqual({
      isNotFound: false,
      credentials: rotated
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}/rotate`
    )
    expect(options.method).toEqual('POST')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test("Should say when Client Sync doesn't have the client", async () => {
    clientSyncRespondsWith(404)

    await expect(rotateClientCredential(clientId)).resolves.toEqual({
      isNotFound: true
    })
  })

  test.each([
    ['CDP refused', 502, { outcome: 'failure' }, 'failure'],
    ['the outcome is unknown', 502, { outcome: 'unknown' }, 'unknown'],
    ['a server error gives no outcome', 500, undefined, 'unknown']
  ])(
    'Should say whether the secret was rotated when %s',
    async (_, status, body, outcome) => {
      clientSyncRespondsWith(status, body)

      const error = await rotateClientCredential(clientId).catch((err) => err)

      expect(error).toBeInstanceOf(RotateClientCredentialError)
      expect(error.outcome).toEqual(outcome)
    }
  )

  test('Should say when the client cannot be rotated, as nothing changed', async () => {
    clientSyncRespondsWith(409, {})

    await expect(rotateClientCredential(clientId)).resolves.toEqual({
      isNotFound: false,
      isConflict: true
    })
  })

  test('Should treat a failed request as an unknown outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const error = await rotateClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(RotateClientCredentialError)
    expect(error.outcome).toEqual('unknown')
    expect(error.message).toEqual(
      'Failed to rotate client credential: fetch failed'
    )
  })

  test('Should treat an unreadable response as an unknown outcome, without leaking it', async () => {
    clientSyncRespondsWith(200, undefined)

    const error = await rotateClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(RotateClientCredentialError)
    expect(error.outcome).toEqual('unknown')
    expect(JSON.stringify(error)).not.toContain(rotated.clientSecret)
  })

  test('Should treat a response without a secret as a rotation, but without a secret', async () => {
    clientSyncRespondsWith(200, { clientId })

    const error = await rotateClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(RotateClientCredentialError)
    expect(error.outcome).toEqual('success')
  })
})
