import { downloadFormats } from '#/server/common/constants/download-formats.js'
import { pageNames } from '#/server/common/constants/page-names.js'
import { paths } from '#/server/common/constants/paths.js'
import { readRegistrationDates } from '#/server/routes/reporting/waste-organisations/registration-dates.js'

const wasteOrganisationsPath = '/reporting/waste-organisations'

/**
 * Maps a request to the page name reported in the metrics dashboard.
 *
 * @param {import('@hapi/hapi').Request} request - The request
 *
 * @returns {String|undefined} The page name, or undefined for untracked paths
 */
export function getPageName(request) {
  if (request.path === '/') {
    return pageNames.home
  }

  if (request.path === paths.softwareProviders) {
    return pageNames.softwareProviders
  }

  if (request.path === paths.createClientCredentials) {
    return pageNames.createClientCredentials
  }

  if (request.path.startsWith(`${paths.newClientCredentials}/`)) {
    return pageNames.newClientCredentials
  }

  if (request.path !== wasteOrganisationsPath) {
    return undefined
  }

  // The search is a GET, so only a search with valid dates shows results or
  // downloads them. Anything else is the search form, with or without errors
  if (readRegistrationDates(request.query).errors) {
    return pageNames.wasteOrganisations
  }

  return request.query.download === downloadFormats.csv
    ? pageNames.wasteOrganisationsDownloadCsv
    : pageNames.wasteOrganisationsResults
}
