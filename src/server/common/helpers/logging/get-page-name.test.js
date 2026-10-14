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

  test('Should return the waste organisations page name when no search has been made', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: {}
    })

    expect(result).toEqual(pageNames.wasteOrganisations)
  })

  test('Should return the results page name when a search has been made', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: { 'date-from-Day': '09', 'date-from-Month': '06' }
    })

    expect(result).toEqual(pageNames.wasteOrganisationsResults)
  })

  test('Should return the download CSV page name when downloading the results', () => {
    const result = getPageName({
      path: '/reporting/waste-organisations',
      query: { 'date-from-Day': '09', download: 'csv' }
    })

    expect(result).toEqual(pageNames.wasteOrganisationsDownloadCsv)
  })

  test('Should return undefined for an untracked path', () => {
    const result = getPageName({ path: '/login', query: {} })

    expect(result).toBeUndefined()
  })
})
