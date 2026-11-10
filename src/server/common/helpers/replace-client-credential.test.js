import {
  replaceClientCredential,
  ReplaceClientCredentialError
} from './replace-client-credential.js'
import { config } from '#/config/config.js'

describe('#replaceClientCredential', () => {
  const clientId = '1234567890abcdef1234567890'
  const replaced = {
    clientId,
    clientName: 'Kerbside_Collect_Test',
    clientSecret: 'new-client-secret'
  }

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
    clientSyncRespondsWith(200, replaced)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should replace the secret of the client of the configured service', async () => {
    await expect(replaceClientCredential(clientId)).resolves.toEqual({
      isNotFound: false,
      credentials: { clientId, clientSecret: 'new-client-secret' }
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api/${clientId}/replace`
    )
    expect(options.method).toEqual('POST')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test('Should keep the new secret when the old one may still work', async () => {
    // The new secret is issued before the old is removed, and can't be fetched again
    clientSyncRespondsWith(502, {
      ...replaced,
      outcome: 'failure',
      message:
        'A new secret was issued, but the old secret may still be active.'
    })

    await expect(replaceClientCredential(clientId)).resolves.toEqual({
      isNotFound: false,
      credentials: { clientId, clientSecret: 'new-client-secret' }
    })
  })

  test("Should say when Client Sync doesn't have the client", async () => {
    clientSyncRespondsWith(404)

    await expect(replaceClientCredential(clientId)).resolves.toEqual({
      isNotFound: true
    })
  })

  test('Should say when the client cannot be replaced, as nothing changed', async () => {
    clientSyncRespondsWith(409, {})

    await expect(replaceClientCredential(clientId)).resolves.toEqual({
      isNotFound: false,
      isConflict: true
    })
  })

  test.each([
    ['CDP refused', 502, { outcome: 'failure' }, 'failure'],
    ['the outcome is unknown', 502, { outcome: 'unknown' }, 'unknown'],
    ['a server error gives no outcome', 500, undefined, 'unknown']
  ])(
    'Should say whether the secret was replaced when %s',
    async (_, status, body, outcome) => {
      clientSyncRespondsWith(status, body)

      const error = await replaceClientCredential(clientId).catch((err) => err)

      expect(error).toBeInstanceOf(ReplaceClientCredentialError)
      expect(error.outcome).toEqual(outcome)
    }
  )

  test('Should treat a failed request as an unknown outcome', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const error = await replaceClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(ReplaceClientCredentialError)
    expect(error.outcome).toEqual('unknown')
    expect(error.message).toEqual(
      'Failed to replace client credential: fetch failed'
    )
  })

  test('Should not keep a secret that belongs to another client', async () => {
    clientSyncRespondsWith(200, { ...replaced, clientId: 'someone-else' })

    const error = await replaceClientCredential(clientId).catch((err) => err)

    expect(error).toBeInstanceOf(ReplaceClientCredentialError)
    expect(error.outcome).toEqual('success')
  })
})
