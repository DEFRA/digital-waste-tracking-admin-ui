import { wasteOrgansiationsReportingSchema } from './schema.js'
import { validateData } from '../../../common/helpers/validate-data.js'
import { getWasteOrganisationsByDate } from '../../../common/helpers/get-waste-organisations.js'
import { createIsoDate } from './create-iso-date.js'

const view = 'reporting/waste-organisations/index'
const pageTitle = 'Waste Organisations'
const heading = 'Waste Organisations'
const breadcrumbs = [
  {
    text: 'Home',
    href: '/'
  },
  {
    text: 'Reporting'
  }
]

/**
 * A GDS styled waste organisations reporting page controller.
 */
export const wasteOrgansiationsReportingGetController = {
  handler(_request, h) {
    return h.view(view, {
      pageTitle,
      heading,
      breadcrumbs
    })
  }
}

export const wasteOrgansiationsReportingPostController = {
  handler(request, h) {
    let dateFrom
    let dateTo
    let wasteOrganisations = []
    let fieldErrors

    const {
      'date-from-Day': dateFromDay,
      'date-from-Month': dateFromMonth,
      'date-from-Year': dateFromYear,
      'date-to-Day': dateToDay,
      'date-to-Month': dateToMonth,
      'date-to-Year': dateToYear
    } = request.payload

    const errors = validateData(
      request.payload,
      wasteOrgansiationsReportingSchema
    )

    console.dir({ errors }, { depth: null })

    if (!errors) {
      dateFrom = createIsoDate(dateFromDay, dateFromMonth, dateFromYear)
      dateTo = createIsoDate(dateToDay, dateToMonth, dateToYear)
      wasteOrganisations = getWasteOrganisationsByDate(dateFrom, dateTo)
    }

    if (errors) {
      fieldErrors = errors.reduce((errorMap, { fieldId, message }) => {
        errorMap[fieldId] = message
        return errorMap
      }, {})
    }

    return h.view(view, {
      pageTitle,
      heading,
      breadcrumbs,
      wasteOrganisations,
      dateFromDay,
      dateFromMonth,
      dateFromYear,
      dateToDay,
      dateToMonth,
      dateToYear,
      dateFrom,
      dateTo,
      errors,
      fieldErrors
    })
  }
}
