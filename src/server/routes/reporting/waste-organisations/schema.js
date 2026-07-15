import { isAfter } from 'date-fns'
import Joi from 'joi'
import { createIsoDate } from '../../../common/helpers/create-iso-date.js'
import { downloadFormats } from '../../../common/constants/download-formats.js'

export const wasteOrgansiationsReportingSchema = Joi.object({
  'date-from-Day': Joi.string().required().label('From date day'),
  'date-from-Month': Joi.string().required().label('From date month'),
  'date-from-Year': Joi.string().required().label('From date year'),
  'date-to-Day': Joi.string().required().label('To date day'),
  'date-to-Month': Joi.string().required().label('To date month'),
  'date-to-Year': Joi.string().required().label('To date year'),
  download: Joi.string()
    .valid(...Object.keys(downloadFormats))
    .label('Download')
})
  .custom((value, helpers) => {
    const dateFrom = createIsoDate(
      value['date-from-Day'],
      value['date-from-Month'],
      value['date-from-Year']
    )
    const dateTo = createIsoDate(
      value['date-to-Day'],
      value['date-to-Month'],
      value['date-to-Year']
    )

    if (!(dateFrom instanceof Date)) {
      return helpers.message('From date must be a valid date', {
        local: { fieldName: 'date-from' }
      })
    }

    if (!(dateTo instanceof Date)) {
      return helpers.message('To date must be a valid date', {
        local: { fieldName: 'date-to' }
      })
    }

    if (isAfter(dateFrom, dateTo)) {
      return helpers.message('To date cannot be before the From date', {
        local: { fieldName: 'date-to' }
      })
    }

    return value
  })
  .messages({
    'any.only': `{{ #label }} must be one of: ${Object.keys(downloadFormats).join(', ')}`
  })
