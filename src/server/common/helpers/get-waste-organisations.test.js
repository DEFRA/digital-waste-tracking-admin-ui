import { createIsoDate } from './create-iso-date'
import { getWasteOrganisationsByDate } from './get-waste-organisations'

describe('#getWasteOrganisationsByDate', () => {
  const dateFrom = createIsoDate('24', '06', '2026')
  const dateTo = createIsoDate('24', '07', '2026')

  test('Should get waste organisations when given dateFrom and dateTo dates', () => {
    const result = getWasteOrganisationsByDate(dateFrom, dateTo)

    expect(result).toEqual([
      {
        organisationId: '7680b304-b18c-4aa4-87a4-ea14cfa20d3d',
        dateRegistered: '2026-06-24T00:00:00.000Z',
        activeApiCodeCount: 1
      }
    ])
  })

  test('Should return an empty array when not given dates', () => {
    const result = getWasteOrganisationsByDate()

    expect(result).toEqual([])
  })

  test('Should return an empty array when only given dateFrom', () => {
    const result = getWasteOrganisationsByDate(dateFrom)

    expect(result).toEqual([])
  })

  test('Should return an empty array when only given dateTo', () => {
    const result = getWasteOrganisationsByDate(undefined, dateTo)

    expect(result).toEqual([])
  })
})
