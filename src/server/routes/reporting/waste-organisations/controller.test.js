import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import { format } from 'date-fns'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

const path = '/reporting/waste-organisations'

const search =
  '?date-from-Day=1&date-from-Month=6&date-from-Year=2026&date-to-Day=1&date-to-Month=7&date-to-Year=2026'

// Out of order, to check the page sorts them oldest first
const wasteOrganisations = [
  {
    organisationId: 'org-2',
    dateRegistered: '2026-06-24T00:00:00.000Z',
    activeApiCodeCount: 1
  },
  {
    organisationId: 'org-1',
    name: 'Deepdale Salvage Partners',
    isLocalAuthority: true,
    dateRegistered: '2026-06-01T09:30:00.000Z',
    activeApiCodeCount: 2
  },
  {
    organisationId: 'org-3',
    name: 'Grantley <Environmental>',
    isLocalAuthority: false,
    dateRegistered: '2026-07-01T23:59:00.000Z',
    activeApiCodeCount: 0
  }
]

describe('#wasteOrganisationsReportingController', () => {
  let server
  let fetchMock

  function getPage(query = '') {
    return server.inject({
      method: 'GET',
      url: `${path}${query}`,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })
  }

  async function documentOf(query) {
    const { result, statusCode } = await getPage(query)

    return { document: new JSDOM(result).window.document, statusCode }
  }

  beforeAll(async () => {
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    // The dates are checked against today
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-30T12:00:00Z'))

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(wasteOrganisations)
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('Before searching', () => {
    test('Should show the empty search and no results', async () => {
      const { document, statusCode } = await documentOf()

      expect(statusCode).toBe(statusCodes.ok)
      expect(document.title).toEqual('Waste organisations - DWT admin portal')
      expect(getElementText(document, 'app-heading-title')).toEqual(
        'Waste organisations'
      )
      expect(document.querySelector('legend h2').textContent.trim()).toEqual(
        'Registration date'
      )
      expect(getElementText(document, 'date-from')).toContain(
        'For example, 1 4 2025'
      )
      expect(getElementText(document, 'date-to')).toContain(
        'For example, 31 3 2026'
      )
      expect(
        [...document.querySelectorAll('.govuk-date-input__input')].map(
          (input) => input.value
        )
      ).toEqual(['', '', '', '', '', ''])
      expect(getElementText(document, 'search-button')).toEqual('Search')
      expect(document.querySelector('[data-testid="error-summary"]')).toBeNull()
      expect(document.querySelector('#results-heading')).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    test('Should clear the search by going back to the page', async () => {
      const { document } = await documentOf(search)
      const clear = document.querySelector('[data-testid="clear-link"]')

      expect(clear.textContent).toEqual('Clear')
      expect(clear.getAttribute('aria-label')).toEqual('Clear search')
      expect(clear.getAttribute('href')).toEqual(path)
    })
  })

  describe('Results', () => {
    test('Should ask for the organisations registered in the period', async () => {
      await getPage(search)

      const url = new URL(fetchMock.mock.calls[0][0])
      expect(url.pathname).toEqual('/organisations')
      expect(url.searchParams.get('startDate')).toEqual(
        '2026-06-01T00:00:00.000Z'
      )
      expect(url.searchParams.get('endDate')).toEqual(
        '2026-07-01T00:00:00.000Z'
      )
    })

    test('Should keep the dates entered', async () => {
      const { document } = await documentOf(search)

      expect(
        [...document.querySelectorAll('.govuk-date-input__input')].map(
          (input) => input.value
        )
      ).toEqual(['1', '6', '2026', '1', '7', '2026'])
    })

    test('Should show the period, the count and a CSV link', async () => {
      const { document } = await documentOf(search)

      expect(getElementText(document, 'search-timeframe')).toEqual(
        'Waste organisations registered from 1 June 2026 to 1 July 2026'
      )
      expect(
        getElementText(document, 'search-results-count').replace(/\s+/g, ' ')
      ).toEqual('Organisations registered in period: 3 download CSV')
      expect(
        document
          .querySelector('[data-testid="download-csv-link"]')
          .getAttribute('href')
      ).toEqual(`${path}${search}&download=csv`)
    })

    test('Should show each organisation, oldest first, as a sortable table', async () => {
      const { document } = await documentOf(search)
      const table = document.querySelector(
        '[data-testid="waste-organisations-list"]'
      )

      expect(table.getAttribute('data-module')).toEqual('moj-sortable-table')
      expect(table.getAttribute('aria-labelledby')).toEqual('results-heading')
      expect(
        [...table.querySelectorAll('thead th')].map((th) => [
          th.textContent.trim(),
          th.getAttribute('aria-sort'),
          th.getAttribute('scope')
        ])
      ).toEqual([
        ['Organisation name and ID', 'none', 'col'],
        ['Local authority', 'none', 'col'],
        ['Active API codes', 'none', 'col'],
        ['Registered', 'ascending', 'col']
      ])

      const rows = [...table.querySelectorAll('tbody tr')].map((row) => [
        ...row.querySelectorAll('th, td')
      ])

      expect(
        rows.map((cells) =>
          cells.map((cell) => cell.textContent.trim().replace(/\s+/g, ' '))
        )
      ).toEqual([
        ['Deepdale Salvage Partners org-1', 'Yes', '2', '1 Jun 2026'],
        ['(Not known) org-2', 'Not known', '1', '24 Jun 2026'],
        // Registered 23:59 UTC on 1 July, which was 2 July in the UK
        ['Grantley <Environmental> org-3', 'No', '0', '2 Jul 2026']
      ])
      // The name is a row header, sorted by the name alone
      expect(rows[0][0].tagName).toEqual('TH')
      expect(rows[0][0].getAttribute('scope')).toEqual('row')
      expect(rows[0][0].getAttribute('data-sort-value')).toEqual(
        'deepdale salvage partners'
      )
      // Registered sorts by the full time, not the shown date
      expect(rows[0][3].getAttribute('data-sort-value')).toEqual(
        '2026-06-01T09:30:00.000Z'
      )
    })

    test('Should show an organisation name as text, not HTML', async () => {
      const { result } = await getPage(search)

      expect(result).toContain('Grantley &lt;Environmental&gt;')
    })

    test('Should say when no organisations registered in the period', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) })

      const { document } = await documentOf(search)

      expect(getElementText(document, 'no-results')).toEqual(
        'No organisations were registered in this period. Try a different date range, or select Clear.'
      )
      expect(
        document.querySelector('[data-testid="waste-organisations-list"]')
      ).toBeNull()
      expect(
        document.querySelector('[data-testid="download-csv-link"]')
      ).toBeNull()
    })
  })

  describe('Errors', () => {
    const wrongDates =
      '?date-from-Day=1&date-from-Month=&date-from-Year=2026&date-to-Day=1&date-to-Month=10&date-to-Year=26'

    test('Should show the errors and keep the dates, without searching', async () => {
      const { document, statusCode } = await documentOf(wrongDates)

      expect(statusCode).toBe(statusCodes.ok)
      expect(document.title).toEqual(
        'Error: Waste organisations - DWT admin portal'
      )
      expect(fetchMock).not.toHaveBeenCalled()
      expect(document.querySelector('#results-heading')).toBeNull()
      expect(
        [...document.querySelectorAll('.govuk-date-input__input')].map(
          (input) => input.value
        )
      ).toEqual(['1', '', '2026', '1', '10', '26'])
    })

    test('Should link to the first wrong input of each date, From first', async () => {
      const { document } = await documentOf(wrongDates)

      expect(
        [
          ...document.querySelectorAll(
            '[data-testid="error-summary"] .govuk-error-summary__list a'
          )
        ].map((link) => [link.textContent.trim(), link.getAttribute('href')])
      ).toEqual([
        ['‘From’ date must include a month', '#date-from-Month'],
        ['Enter the ‘To’ date in the correct format', '#date-to-Year']
      ])
    })

    test('Should show the messages in the group, described by it', async () => {
      const { document } = await documentOf(wrongDates)
      const group = document.querySelector('.govuk-form-group--error')
      const fieldset = group.querySelector('[data-testid="registration-date"]')

      expect(fieldset.getAttribute('aria-describedby')).toEqual(
        'date-from-error date-to-error'
      )
      expect(getElementText(document, 'date-from-error')).toEqual(
        'Error: ‘From’ date must include a month'
      )
      expect(getElementText(document, 'date-to-error')).toEqual(
        'Error: Enter the ‘To’ date in the correct format'
      )
    })

    test('Should mark only the wrong inputs', async () => {
      const { document } = await documentOf(wrongDates)

      expect(
        [...document.querySelectorAll('.govuk-input--error')].map(
          (input) => input.id
        )
      ).toEqual(['date-from-Month', 'date-to-Year'])
    })
  })

  describe('CSV download', () => {
    test('Should download the organisations, oldest first', async () => {
      const { result, statusCode, headers } = await getPage(
        `${search}&download=csv`
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        '\ufeffOrganisation name,Organisation ID,Local authority,Active API codes,Registered (UTC)\n' +
          'Deepdale Salvage Partners,org-1,Yes,2,"01 Jun 2026, 09:30"\n' +
          ',org-2,Not known,1,"24 Jun 2026, 00:00"\n' +
          'Grantley <Environmental>,org-3,No,0,"01 Jul 2026, 23:59"\n'
      )
      expect(headers['content-type']).toEqual('text/csv; charset=utf-8')
      expect(headers['content-disposition']).toEqual(
        `attachment; filename=${format(new Date(), 'yyMMddHHmmss')}-orgs-260601-260701.csv`
      )
    })

    test('Should not download anything for wrong dates', async () => {
      const { headers } = await getPage(
        '?date-from-Day=31&date-from-Month=2&date-from-Year=2026&date-to-Day=1&date-to-Month=7&date-to-Year=2026&download=csv'
      )

      expect(headers['content-type']).toContain('text/html')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  test('Should ask anyone not signed in to sign in', async () => {
    const { statusCode } = await server.inject({ method: 'GET', url: path })

    expect(statusCode).toBe(statusCodes.found)
  })
})
