import { createIsoDate } from './create-iso-date'

describe('#createIsoDate', () => {
  test('Should return a correctly formatted date when given only date parts', () => {
    const result = createIsoDate('09', '06', '2026')

    expect(result).toEqual(new Date('2026-06-09T00:00:00.000Z'))
  })

  test('Should return a correctly formatted date when given single digit month and day parts', () => {
    const result = createIsoDate('9', '6', '2026')

    expect(result).toEqual(new Date('2026-06-09T00:00:00.000Z'))
  })

  test('Should return a correctly formatted date when given date and time parts', () => {
    const result = createIsoDate('09', '06', '2026', '12', '30', '45')

    expect(result).toEqual(new Date('2026-06-09T12:30:45.000Z'))
  })

  test('Should return undefined when not given date parts', () => {
    const result = createIsoDate()

    expect(result).toBeUndefined()
  })

  test('Should return undefined when given an invalid date with numbers', () => {
    const result = createIsoDate('32', '06', '2026')

    expect(result).toBeUndefined()
  })

  test('Should return undefined when given an invalid date with letters', () => {
    const result = createIsoDate('one', '06', '2026')

    expect(result).toBeUndefined()
  })
})
