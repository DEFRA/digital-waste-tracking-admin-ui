import { wasteOrgansiationsReportingSchema } from './schema.js'
import { validateData } from '../../../common/helpers/validate-data.js'
import { getWasteOrganisationsByDate } from '../../../common/helpers/get-waste-organisations.js'
import { createIsoDate } from '../../../common/helpers/create-iso-date.js'

export const wasteOrganisationsReportingController = {
  handler(request, h) {
    let errors
    let dateFrom
    let dateTo
    let wasteOrganisations = []

    const {
      'date-from-Day': dateFromDay,
      'date-from-Month': dateFromMonth,
      'date-from-Year': dateFromYear,
      'date-to-Day': dateToDay,
      'date-to-Month': dateToMonth,
      'date-to-Year': dateToYear
    } = request.query

    if (Object.values(request.query).length > 0) {
      errors = validateData(request.query, wasteOrgansiationsReportingSchema)
    }

    if (!errors) {
      dateFrom = createIsoDate(dateFromDay, dateFromMonth, dateFromYear)
      dateTo = createIsoDate(dateToDay, dateToMonth, dateToYear)
      wasteOrganisations = getWasteOrganisationsByDate(dateFrom, dateTo)
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
