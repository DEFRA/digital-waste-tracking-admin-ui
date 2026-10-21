import { createNewClientCredentialsStore } from './new-client-credentials-store.js'

describe('#createNewClientCredentialsStore', () => {
  const credentials = {
    clientId: 'new-client-id',
    clientSecret: 'new-client-secret'
  }

  let cache
  let server

  const requestFrom = (username) => ({
    auth: { credentials: { username } },
    yar: { get: vi.fn(), set: vi.fn() }
  })

  beforeEach(() => {
    const stored = new Map()
    cache = {
      set: vi.fn(async (key, value) => stored.set(key, value)),
      get: vi.fn(async (key) => stored.get(key) ?? null),
      drop: vi.fn(async (key) => stored.delete(key))
    }
    server = { cache: vi.fn(() => cache) }
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

  test('Should keep the credentials and their owner under a random id, and nothing in the session', async () => {
    const store = createNewClientCredentialsStore(server)
    const request = requestFrom('test1')

    const id = await store.save(request, credentials)

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(cache.set).toHaveBeenCalledWith(id, {
      owner: 'test1',
      credentials
    })
    expect(request.yar.set).not.toHaveBeenCalled()
  })

  test('Should give the credentials back once', async () => {
    const store = createNewClientCredentialsStore(server)
    const request = requestFrom('test1')
    const id = await store.save(request, credentials)

    expect(await store.take(request, id)).toEqual(credentials)
    expect(await store.take(request, id)).toBeNull()
    expect(cache.drop).toHaveBeenCalledWith(id)
  })

  test('Should keep each of two creates separate, as from two tabs', async () => {
    const store = createNewClientCredentialsStore(server)
    const request = requestFrom('test1')
    const other = { clientId: 'other-client-id', clientSecret: 'other-secret' }

    const firstId = await store.save(request, credentials)
    const secondId = await store.save(request, other)

    expect(await store.take(request, secondId)).toEqual(other)
    expect(await store.take(request, firstId)).toEqual(credentials)
  })

  test("Should not give another user's credentials back, or drop them", async () => {
    const store = createNewClientCredentialsStore(server)
    const id = await store.save(requestFrom('test1'), credentials)

    expect(await store.take(requestFrom('test2'), id)).toBeNull()
    expect(cache.drop).not.toHaveBeenCalled()
    expect(await store.take(requestFrom('test1'), id)).toEqual(credentials)
  })

  test('Should give nothing back without a signed-in user', async () => {
    const store = createNewClientCredentialsStore(server)
    const id = await store.save(requestFrom('test1'), credentials)

    expect(await store.take(requestFrom(undefined), id)).toBeNull()
  })

  test('Should give nothing back for an unknown id', async () => {
    const store = createNewClientCredentialsStore(server)

    expect(await store.take(requestFrom('test1'), 'unknown-id')).toBeNull()
  })
})
