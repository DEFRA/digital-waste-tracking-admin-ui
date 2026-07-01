import { wasteOrgansiationsReportingSchema } from './schema'

describe('#wasteOrgansiationsReportingSchema', () => {
  let data

  beforeEach(() => {
    data = {
      'date-from-Day': '01',
      'date-from-Month': '06',
      'date-from-Year': '2026',
      'date-to-Day': '02',
      'date-to-Month': '07',
      'date-to-Year': '2027'
    }
  })

  test('Should pass when given valid data', () => {
    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeUndefined()
  })

  test('Should fail when not given date-from-Day', () => {
    delete data['date-from-Day']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date day" is required')
  })

  test('Should fail when date-from-Day is not a string', () => {
    data['date-from-Day'] = 10

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date day" must be a string')
  })

  test('Should fail when not given date-from-Month', () => {
    delete data['date-from-Month']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date month" is required')
  })

  test('Should fail when date-from-Month is not a string', () => {
    data['date-from-Month'] = 11

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date month" must be a string')
  })

  test('Should fail when not given date-from-Year', () => {
    delete data['date-from-Year']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date year" is required')
  })

  test('Should fail when date-from-Year is not a string', () => {
    data['date-from-Year'] = 2026

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"From date year" must be a string')
  })

  test('Should fail when not given date-to-Day', () => {
    delete data['date-to-Day']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date day" is required')
  })

  test('Should fail when date-to-Day is not a string', () => {
    data['date-to-Day'] = 10

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date day" must be a string')
  })

  test('Should fail when not given date-to-Month', () => {
    delete data['date-to-Month']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date month" is required')
  })

  test('Should fail when date-to-Month is not a string', () => {
    data['date-to-Month'] = 11

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date month" must be a string')
  })

  test('Should fail when not given date-to-Year', () => {
    delete data['date-to-Year']

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date year" is required')
  })

  test('Should fail when date-to-Year is not a string', () => {
    data['date-to-Year'] = 2026

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('"To date year" must be a string')
  })

  test('Should fail when date-from is not a valid date', () => {
    data['date-from-Day'] = '32'

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('From date must be a valid date')
  })

  test('Should fail when date-to is not a valid date', () => {
    data['date-to-Day'] = '32'

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('To date must be a valid date')
  })

  test('Should fail when date-to is before date-from', () => {
    data['date-to-Year'] = '2024'

    const { error } = wasteOrgansiationsReportingSchema.validate(data)

    expect(error).toBeDefined()
    expect(error.message).toEqual('To date must be later than From date')
  })
})
