import { createIsoDate } from './create-iso-date.js'
import { getWasteOrganisationsByDate } from './get-waste-organisations.js'
import { config } from '#/config/config.js'

describe('#getWasteOrganisationsByDate', () => {
  const dateFrom = createIsoDate('24', '06', '2026')
  const dateTo = createIsoDate('24', '07', '2026')

  const wasteOrganisations = [
    {
      organisationId: '7680b304-b18c-4aa4-87a4-ea14cfa20d3d',
      dateRegistered: '2026-06-24T00:00:00.000Z',
      activeApiCodeCount: 1
    }
  ]

  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(wasteOrganisations)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should request the waste organisations for the given date range', async () => {
    const result = await getWasteOrganisationsByDate(dateFrom, dateTo)

    expect(result).toEqual(wasteOrganisations)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, options] = fetchMock.mock.calls[0]

    expect(`${url.origin}${url.pathname}`).toEqual(
      `${config.get('services.wasteOrganisation')}/organisations`
    )
    expect(url.searchParams.get('startDate')).toEqual(dateFrom.toISOString())
    expect(url.searchParams.get('endDate')).toEqual(dateTo.toISOString())
    expect(options.method).toEqual('GET')
    expect(options.headers.Authorization).toMatch(/^Basic /)
  })

  test('Should throw when the backend responds with a non-ok status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(getWasteOrganisationsByDate(dateFrom, dateTo)).rejects.toThrow(
      'Failed to get waste organisations: 500 Internal Server Error'
    )
  })
})
