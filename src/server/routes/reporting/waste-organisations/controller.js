import { wasteOrgansiationsReportingSchema } from './schema.js'
import { validateData } from '../../../common/helpers/validate-data.js'
import { getWasteOrganisationsByDate } from '../../../common/helpers/get-waste-organisations.js'
import { createIsoDate } from '../../../common/helpers/create-iso-date.js'
import { downloadFormats } from '../../../common/constants/download-formats.js'
import { format } from 'date-fns'
import { generateCsvWasteOrganisations } from './generate-csv-waste-organisations.js'

export const wasteOrganisationsReportingController = {
  async handler(request, h) {
    let errors
    let dateFrom
    let dateTo
    let wasteOrganisations = []

    // Search is done as a GET request so we can provide bookmarkable search results
    const {
      'date-from-Day': dateFromDay,
      'date-from-Month': dateFromMonth,
      'date-from-Year': dateFromYear,
      'date-to-Day': dateToDay,
      'date-to-Month': dateToMonth,
      'date-to-Year': dateToYear,
      download
    } = request.query

    if (Object.values(request.query).length > 0) {
      errors = validateData(request.query, wasteOrgansiationsReportingSchema)
    }

    if (!errors) {
      dateFrom = createIsoDate(dateFromDay, dateFromMonth, dateFromYear)
      dateTo = createIsoDate(dateToDay, dateToMonth, dateToYear)

      if (dateFrom && dateTo) {
        wasteOrganisations = await getWasteOrganisationsByDate(dateFrom, dateTo)

        if (download === downloadFormats.csv) {
          const csv = generateCsvWasteOrganisations(wasteOrganisations)

          return h
            .response(csv)
            .header('Content-Type', 'text/csv')
            .header(
              'Content-Disposition',
              `attachment; filename=${format(new Date(), 'yyMMddHHmmss')}-orgs-${format(dateFrom, 'yyMMdd')}-${format(dateTo, 'yyMMdd')}.csv`
            )
        }
      }
    }

    return h.view('reporting/waste-organisations/index', {
      pageTitle: 'Waste Organisations Report',
      heading: 'Waste Organisations',
      serviceName: 'DWT Admin Portal',
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Reporting' }],
      wasteOrganisations,
      dateFromDay,
      dateFromMonth,
      dateFromYear,
      dateToDay,
      dateToMonth,
      dateToYear,
      dateFrom,
      dateTo,
      errors
    })
  }
}
