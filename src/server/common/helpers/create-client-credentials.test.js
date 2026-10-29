import { createClientCredentials } from './create-client-credentials.js'
import { config } from '#/config/config.js'

describe('#createClientCredentials', () => {
  const created = {
    clientId: 'new-client-id',
    clientName: 'Waste_Technologies_Software',
    clientSecret: 'new-client-secret'
  }

  let fetchMock

  function respondWith(status, body) {
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'Status text',
      json: () => Promise.resolve(body)
    })
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    respondWith(200, created)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should ask Client Sync to create the client for the configured service', async () => {
    await createClientCredentials('Waste_Technologies_Software')

    const [url, options] = fetchMock.mock.calls[0]

    expect(url.toString()).toEqual(
      `${config.get('services.clientSync')}/clients/waste-movement-external-api`
    )
    expect(options.method).toEqual('POST')
    expect(JSON.parse(options.body)).toEqual({
      clientName: 'Waste_Technologies_Software'
    })
    expect(options.headers.Authorization).toMatch(/^Basic /)
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  test('Should return the new credentials', async () => {
    expect(
      await createClientCredentials('Waste_Technologies_Software')
    ).toEqual({ isDuplicate: false, credentials: created })
  })

  test('Should say when a client with the name already exists', async () => {
    respondWith(409, { message: 'already exists' })

    expect(await createClientCredentials('Existing_Client')).toEqual({
      isDuplicate: true
    })
  })

  test('Should throw with only the status when Client Sync fails', async () => {
    respondWith(502, { message: 'CDP refused the create request' })

    await expect(
      createClientCredentials('Waste_Technologies_Software')
    ).rejects.toThrow('Failed to create client credentials: 502 Status text')
  })

  test.each([
    [400, false],
    [404, false],
    [500, true],
    [502, true]
  ])(
    'Should say whether the client may exist when Client Sync replies %s',
    async (status, outcomeUnknown) => {
      respondWith(status, {})

      const error = await createClientCredentials(
        'Waste_Technologies_Software'
      ).catch((err) => err)

      expect(error.outcomeUnknown).toBe(outcomeUnknown)
    }
  )

  test('Should say the client may exist when Client Sync does not reply in time', async () => {
    const timeout = new DOMException('The operation timed out', 'TimeoutError')
    fetchMock.mockRejectedValue(timeout)

    const error = await createClientCredentials(
      'Waste_Technologies_Software'
    ).catch((err) => err)

    expect(error.message).toEqual(
      'Failed to create client credentials: The operation timed out'
    )
    expect(error.outcomeUnknown).toBe(true)
    expect(error.cause).toBe(timeout)
  })

  test('Should throw without quoting a response it cannot read', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => JSON.parse('{"clientSecret": "new-client-secret", oops')
    })

    const error = await createClientCredentials(
      'Waste_Technologies_Software'
    ).catch((err) => err)

    expect(error.message).toEqual(
      'Client Sync returned client credentials that could not be read'
    )
    expect(error.message).not.toContain('new-client-secret')
    expect(error.outcomeUnknown).toBe(true)
  })

  test('Should throw when the response has no secret', async () => {
    respondWith(200, { ...created, clientSecret: undefined })

    await expect(
      createClientCredentials('Waste_Technologies_Software')
    ).rejects.toMatchObject({
      message: 'Client Sync returned client credentials without a secret',
      outcomeUnknown: true
    })
  })
})
