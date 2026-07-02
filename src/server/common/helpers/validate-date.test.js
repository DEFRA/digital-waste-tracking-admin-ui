import Joi from 'joi'
import { validateData } from './validate-data'

describe('#validateData', () => {
  const schema = Joi.object({
    day: Joi.string().required()
  }).custom((value, helpers) => {
    if (value.day < 1) {
      return helpers.message('Day must be a positive number', {
        local: { fieldName: 'date-day' }
      })
    }

    return value
  })

  test('Should pass when given valid data', () => {
    const data = { day: '29' }

    const result = validateData(data, schema)

    expect(result).toBeUndefined()
  })

  test('Should return errors in the correct format (standard field name) when given invalid data', () => {
    const data = {}

    const result = validateData(data, schema)

    expect(result).toEqual({
      day: '"day" is required'
    })
  })

  test('Should return errors in the correct format (custom field name) when given invalid data', () => {
    const data = { day: '0' }

    const result = validateData(data, schema)

    expect(result).toEqual({
      'date-day': 'Day must be a positive number'
    })
  })
})
