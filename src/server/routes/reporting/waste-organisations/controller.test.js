import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import { format } from 'date-fns'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'

function assertCommonPageElements(document, statusCode) {
  const pageTitle = getElementText(document, 'app-heading-title')
  const pageBody = getElementText(document, 'app-page-body')
  const dateFromDay = getElementText(document, 'date-from-day')
  const dateFromMonth = getElementText(document, 'date-from-month')
  const dateFromYear = getElementText(document, 'date-from-year')
  const dateToDay = getElementText(document, 'date-to-day')
  const dateToMonth = getElementText(document, 'date-to-month')
  const dateToYear = getElementText(document, 'date-to-year')

  expect(statusCode).toBe(statusCodes.ok)
  expect(document.title).toEqual(
    'Waste Organisations Report | DWT Admin Portal'
  )
  expect(pageTitle).toEqual('Waste Organisations')
  expect(pageBody).toContain(
    'Search waste organisations by DefraID registration date.'
  )
  expect(dateFromDay).toBeDefined()
  expect(dateFromMonth).toBeDefined()
  expect(dateFromYear).toBeDefined()
  expect(dateToDay).toBeDefined()
  expect(dateToMonth).toBeDefined()
  expect(dateToYear).toBeDefined()
}

const wasteOrganisations = Array.from({ length: 11 }, (_, index) => ({
  organisationId: `org-${index}`,
  dateRegistered: '2026-06-24T00:00:00.000Z',
  activeApiCodeCount: 1
}))

describe('#wasteOrganisationsReportingController', () => {
  let server

  beforeAll(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(wasteOrganisations)
      })
    )

    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await server.stop({ timeout: 0 })
  })

  test('Should provide successful response when landing on the page and given a basic auth credential', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting/waste-organisations',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    const { document } = new JSDOM(result).window

    const searchTimeframe = getElementText(document, 'search-timeframe')
    const searchResultsCount = getElementText(document, 'search-results-count')
    const wasteOrganisationsList = document.querySelector(
      `[data-testid="waste-organisations-list"]`
    )
    const downloadCsvButtonText = getElementText(
      document,
      'download-csv-button'
    )

    assertCommonPageElements(document, statusCode)

    expect(searchTimeframe).toBeUndefined()
    expect(searchResultsCount).toBeUndefined()
    expect(wasteOrganisationsList).toBeNull()
    expect(downloadCsvButtonText).toBeUndefined()
  })

  test('Should provide successful response when searching and given a basic auth credential', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting/waste-organisations?date-from-Day=01&date-from-Month=06&date-from-Year=2026&date-to-Day=01&date-to-Month=07&date-to-Year=2026',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    const { document } = new JSDOM(result).window

    const searchTimeframe = getElementText(document, 'search-timeframe')
    const searchResultsCount = getElementText(document, 'search-results-count')
    const wasteOrganisationsList = document.querySelector(
      `[data-testid="waste-organisations-list"]`
    )
    const tableHeaders = wasteOrganisationsList.getElementsByClassName(
      'govuk-table__header'
    )
    const tableRows =
      wasteOrganisationsList.getElementsByClassName('govuk-table__row')
    const downloadCsvButtonText = getElementText(
      document,
      'download-csv-button'
    )

    assertCommonPageElements(document, statusCode)

    expect(searchTimeframe).toEqual(
      'Waste organisations registered from 01 June 2026 to 01 July 2026'
    )
    expect(searchResultsCount).toEqual(
      'Organisations registered (in period): 11'
    )
    expect(tableHeaders.length).toEqual(3)
    expect(tableHeaders[0].textContent).toEqual('Organisation ID')
    expect(tableHeaders[1].textContent).toEqual('Registered')
    expect(tableHeaders[2].textContent).toEqual('Active API Codes')
    expect(tableRows.length).toEqual(12) // 1 header row + 11 body rows
    expect(downloadCsvButtonText).toEqual('Download CSV')
  })

  test('Should download CSV file when given a basic auth credential', async () => {
    const { result, statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/reporting/waste-organisations?date-from-Day=24&date-from-Month=06&date-from-Year=2026&date-to-Day=01&date-to-Month=07&date-to-Year=2026&download=csv',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      '\ufeffOrganisation ID,Registered (UTC),Active API Codes\n' +
        wasteOrganisations
          .map(
            ({ organisationId }) => `${organisationId},"24 Jun 2026, 00:00",1\n`
          )
          .join('')
    )

    expect(headers['content-type']).toEqual('text/csv; charset=utf-8')
    expect(headers['content-disposition']).toEqual(
      `attachment; filename=${format(new Date(), 'yyMMddHHmmss')}-orgs-260624-260701.csv`
    )
  })

  test('Should display error messages', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting/waste-organisations?date-from-Day=&date-from-Month=&date-from-Year=2026&date-to-Day=01&date-to-Month=07&date-to-Year=&download=tsv',
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    const { document } = new JSDOM(result).window

    const errorSummaryText = getElementText(document, 'error-summary')
    const dateFromFieldText = getElementText(document, 'date-from')
    const dateToFieldText = getElementText(document, 'date-to')

    assertCommonPageElements(document, statusCode)

    expect(errorSummaryText).toContain('There is a problem')
    expect(errorSummaryText).toContain(
      '"From date day" is not allowed to be empty'
    )
    expect(errorSummaryText).toContain(
      '"From date month" is not allowed to be empty'
    )
    expect(errorSummaryText).toContain(
      '"To date year" is not allowed to be empty'
    )
    expect(errorSummaryText).toContain('"Download" must be one of: csv')

    expect(dateFromFieldText).toContain(
      '"From date day" is not allowed to be empty'
    )

    expect(dateToFieldText).toContain(
      '"To date year" is not allowed to be empty'
    )
  })

  test('Should provide failed response when not given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/reporting/waste-organisations'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
