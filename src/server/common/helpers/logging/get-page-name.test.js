import { getPageName } from './get-page-name.js'
import { pageNames } from '#/server/common/constants/page-names.js'

describe('#getPageName', () => {
  test('Should return the home page name for the root path', () => {
    const result = getPageName({ path: '/', query: {} })

    expect(result).toEqual(pageNames.home)
  })

  test('Should return the software providers page name', () => {
    const result = getPageName({ path: '/software-providers', query: {} })

    expect(result).toEqual(pageNames.softwareProviders)
  })

  test.each([
    ['/software-providers/create', pageNames.createClientCredentials],
    ['/software-providers/credentials/an-id', pageNames.newClientCredentials]
  ])('Should return the page name for %s', (path, pageName) => {
    expect(getPageName({ path, query: {} })).toEqual(pageName)
  })

  test('Should return the waste organisations page name when no search has been made', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: {}
    })

    expect(result).toEqual(pageNames.wasteOrganisations)
  })

  const search = {
    'date-from-Day': '09',
    'date-from-Month': '06',
    'date-from-Year': '2026',
    'date-to-Day': '10',
    'date-to-Month': '06',
    'date-to-Year': '2026'
  }

  test('Should return the waste organisations page name when a search has wrong dates', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: { ...search, 'date-from-Month': '', download: 'csv' }
    })

    expect(result).toEqual(pageNames.wasteOrganisations)
  })

  test('Should return the results page name when a search has been made', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: search
    })

    expect(result).toEqual(pageNames.wasteOrganisationsResults)
  })

  test('Should return the download CSV page name when downloading the results', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: { ...search, download: 'csv' }
    })

    expect(result).toEqual(pageNames.wasteOrganisationsDownloadCsv)
  })

  test('Should return undefined for an untracked path', () => {
    const result = getPageName({ path: '/login', query: {} })

    expect(result).toBeUndefined()
  })
})
