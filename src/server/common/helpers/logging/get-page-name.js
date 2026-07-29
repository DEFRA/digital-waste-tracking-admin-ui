import { downloadFormats } from '#/server/common/constants/download-formats.js'
import { pageNames } from '#/server/common/constants/page-names.js'

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

  if (request.path !== wasteOrganisationsPath) {
    return undefined
  }

  if (request.query.download === downloadFormats.csv) {
    return pageNames.wasteOrganisationsDownloadCsv
  }

  // The search is a GET, so query params are what distinguishes a results view
  // from the empty search form
  return Object.keys(request.query).length
    ? pageNames.wasteOrganisationsResults
    : pageNames.wasteOrganisations
}
