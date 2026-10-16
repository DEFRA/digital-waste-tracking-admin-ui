import { createNewClientCredentialsStore } from './new-client-credentials-store.js'

describe('#createNewClientCredentialsStore', () => {
  const credentials = {
    clientId: 'new-client-id',
    clientSecret: 'new-client-secret'
  }

  let cache
  let server
  let request

  beforeEach(() => {
    const stored = new Map()
    cache = {
      set: vi.fn(async (key, value) => stored.set(key, value)),
      get: vi.fn(async (key) => stored.get(key) ?? null),
      drop: vi.fn(async (key) => stored.delete(key))
    }
    server = { cache: vi.fn(() => cache) }

    const session = new Map()
    request = {
      yar: {
        set: vi.fn((key, value) => session.set(key, value)),
        get: vi.fn((key, clear) => {
          const value = session.get(key)
          if (clear) {
            session.delete(key)
          }
          return value
        })
      }
    }
  })

  test('Should keep the credentials in a short-lived server-side cache', () => {
    createNewClientCredentialsStore(server)

    expect(server.cache).toHaveBeenCalledWith(
      expect.objectContaining({
        segment: 'new-client-credentials',
        expiresIn: 5 * 60 * 1000
      })
    )
  })

  test('Should keep only a random key in the session, never the credentials', async () => {
    const store = createNewClientCredentialsStore(server)

    await store.save(request, credentials)

    const [, key] = request.yar.set.mock.calls[0]
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(JSON.stringify(request.yar.set.mock.calls)).not.toContain(
      credentials.clientSecret
    )
    expect(cache.set).toHaveBeenCalledWith(key, credentials)
  })

  test('Should give the credentials back once', async () => {
    const store = createNewClientCredentialsStore(server)
    await store.save(request, credentials)

    expect(await store.take(request)).toEqual(credentials)
    expect(await store.take(request)).toBeNull()
    expect(cache.drop).toHaveBeenCalled()
  })

  test('Should give nothing back when none were saved', async () => {
    const store = createNewClientCredentialsStore(server)

    expect(await store.take(request)).toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })
})
