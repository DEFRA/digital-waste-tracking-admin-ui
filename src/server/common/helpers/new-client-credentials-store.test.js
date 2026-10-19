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

  test('Should keep only random ids in the session, never the credentials', async () => {
    const store = createNewClientCredentialsStore(server)

    const id = await store.save(request, credentials)

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(request.yar.set).toHaveBeenCalledWith('newClientCredentialsIds', [
      id
    ])
    expect(JSON.stringify(request.yar.set.mock.calls)).not.toContain(
      credentials.clientSecret
    )
    expect(cache.set).toHaveBeenCalledWith(id, credentials)
  })

  test('Should give the credentials back once', async () => {
    const store = createNewClientCredentialsStore(server)
    const id = await store.save(request, credentials)

    expect(await store.take(request, id)).toEqual(credentials)
    expect(await store.take(request, id)).toBeNull()
    expect(cache.drop).toHaveBeenCalledWith(id)
  })

  test('Should keep each of two creates separate, as from two tabs', async () => {
    const store = createNewClientCredentialsStore(server)
    const other = { clientId: 'other-client-id', clientSecret: 'other-secret' }

    const firstId = await store.save(request, credentials)
    const secondId = await store.save(request, other)

    expect(await store.take(request, firstId)).toEqual(credentials)
    expect(await store.take(request, secondId)).toEqual(other)
  })

  test("Should not give another session's credentials back", async () => {
    const store = createNewClientCredentialsStore(server)
    const id = await store.save(request, credentials)
    const otherSession = { yar: { get: vi.fn(), set: vi.fn() } }

    expect(await store.take(otherSession, id)).toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })

  test('Should give nothing back when none were saved', async () => {
    const store = createNewClientCredentialsStore(server)

    expect(await store.take(request, 'unknown-id')).toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })
})
