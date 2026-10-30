import { UTCDate } from '@date-fns/utc'
import { format } from 'date-fns'

import { getWasteOrganisationsByDate } from '../../../common/helpers/get-waste-organisations.js'
import { downloadFormats } from '../../../common/constants/download-formats.js'
import { generateCsvWasteOrganisations } from './generate-csv-waste-organisations.js'
import { localAuthorityText } from './local-authority.js'
import { readRegistrationDates } from './registration-dates.js'

const dateFields = [
  'date-from-Day',
  'date-from-Month',
  'date-from-Year',
  'date-to-Day',
  'date-to-Month',
  'date-to-Year'
]

/**
 * @param {Object} [dateErrors] - The errors by date id, From first
 *
 * @returns {Object<String, String>} The messages for the error summary, each
 * linking to the date's first wrong input
 */
function errorSummaryOf(dateErrors = {}) {
  return Object.fromEntries(
    Object.entries(dateErrors).map(([id, { text, parts }]) => [
      `${id}-${parts[0]}`,
      text
    ])
  )
}

export const wasteOrganisationsReportingController = {
  async handler(request, h) {
    const { query } = request
    const values = Object.fromEntries(
      dateFields.map((field) => [field, query[field]])
    )

    // Search is done as a GET request so we can provide bookmarkable search
    // results. Nothing is shown until someone searches
    const searched = dateFields.some((field) => field in query)
    const {
      dateFrom,
      dateTo,
      errors: dateErrors
    } = searched ? readRegistrationDates(query) : {}

    let wasteOrganisations

    if (dateFrom && dateTo) {
      // Oldest first, which is also the order without JavaScript
      wasteOrganisations = (
        await getWasteOrganisationsByDate(dateFrom, dateTo)
      ).toSorted((a, b) => a.dateRegistered.localeCompare(b.dateRegistered))

      if (query.download === downloadFormats.csv) {
        return h
          .response(generateCsvWasteOrganisations(wasteOrganisations))
          .header('Content-Type', 'text/csv')
          .header(
            'Content-Disposition',
            `attachment; filename=${format(new Date(), 'yyMMddHHmmss')}-orgs-${format(new UTCDate(dateFrom), 'yyMMdd')}-${format(new UTCDate(dateTo), 'yyMMdd')}.csv`
          )
      }
    }

    return h.view('reporting/waste-organisations/index', {
      pageTitle: dateErrors
        ? 'Error: Waste organisations'
        : 'Waste organisations',
      heading: 'Waste organisations',
      serviceName: 'DWT admin portal',
      values,
      dateErrors,
      // For the layout's error summary
      errors: errorSummaryOf(dateErrors),
      // Dates are shown in UTC, as the CSV gives them
      period: dateFrom && {
        from: format(new UTCDate(dateFrom), 'd MMMM yyyy'),
        to: format(new UTCDate(dateTo), 'd MMMM yyyy')
      },
      wasteOrganisations: wasteOrganisations?.map((organisation) => ({
        ...organisation,
        registered: format(
          new UTCDate(organisation.dateRegistered),
          'd MMM yyyy'
        ),
        localAuthority: localAuthorityText(organisation.isLocalAuthority)
      })),
      csvQuery: new URLSearchParams({
        ...values,
        download: downloadFormats.csv
      }).toString()
    })
  }
}
