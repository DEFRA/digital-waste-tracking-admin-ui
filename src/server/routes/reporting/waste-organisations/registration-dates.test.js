import { readRegistrationDates } from './registration-dates.js'

const now = new Date('2026-10-30T15:00:00Z')
const all = ['Day', 'Month', 'Year']

function query(from, to) {
  const [fromDay, fromMonth, fromYear] = from
  const [toDay, toMonth, toYear] = to
  return {
    'date-from-Day': fromDay,
    'date-from-Month': fromMonth,
    'date-from-Year': fromYear,
    'date-to-Day': toDay,
    'date-to-Month': toMonth,
    'date-to-Year': toYear
  }
}

const valid = ['1', '1', '2026']

describe('#readRegistrationDates', () => {
  test('Should read valid dates as the start of each day (UTC)', () => {
    expect(
      readRegistrationDates(
        query(['1', '1', '2026'], ['01', '10', '2026']),
        now
      )
    ).toEqual({
      dateFrom: new Date('2026-01-01T00:00:00Z'),
      dateTo: new Date('2026-10-01T00:00:00Z')
    })
  })

  test('Should allow the same From and To date, and today', () => {
    expect(
      readRegistrationDates(
        query(['30', '10', '2026'], ['30', '10', '2026']),
        now
      )
    ).toEqual({
      dateFrom: new Date('2026-10-30T00:00:00Z'),
      dateTo: new Date('2026-10-30T00:00:00Z')
    })
  })

  test("Should allow today's UK date in the first hour of a summer day, when it's still yesterday in UTC", () => {
    const earlyBst = new Date('2026-07-01T23:30:00Z') // 00:30 on 2 July in the UK

    expect(
      readRegistrationDates(
        query(['2', '7', '2026'], ['2', '7', '2026']),
        earlyBst
      ).errors
    ).toBeUndefined()
  })

  test('Should treat a repeated parameter as the wrong format', () => {
    expect(
      readRegistrationDates(
        { ...query(valid, valid), 'date-from-Day': ['1', '2'] },
        now
      ).errors
    ).toEqual({
      'date-from': {
        text: 'Enter the ‘From’ date in the correct format',
        parts: ['Day']
      }
    })
  })

  test('Should ignore spaces around the values', () => {
    expect(
      readRegistrationDates(query([' 1 ', '1', '2026 '], valid), now).dateFrom
    ).toEqual(new Date('2026-01-01T00:00:00Z'))
  })

  test.each([
    ['nothing entered', ['', '', ''], 'Enter a ‘From’ date', all],
    [
      'no fields at all',
      [undefined, undefined, undefined],
      'Enter a ‘From’ date',
      all
    ],
    [
      'the day missing',
      ['', '5', '2026'],
      '‘From’ date must include a day',
      ['Day']
    ],
    [
      'the month missing',
      ['17', '', '2026'],
      '‘From’ date must include a month',
      ['Month']
    ],
    [
      'the year missing',
      ['17', '5', ''],
      '‘From’ date must include a year',
      ['Year']
    ],
    [
      'more than one part missing',
      ['', '', '2026'],
      '‘From’ date must include a day, month and year',
      all
    ],
    [
      'letters',
      ['1', 'Jan', '2026'],
      'Enter the ‘From’ date in the correct format',
      ['Month']
    ],
    [
      'a 2-digit year',
      ['1', '1', '26'],
      'Enter the ‘From’ date in the correct format',
      ['Year']
    ],
    [
      'several parts in the wrong format',
      ['x', '1', '26'],
      'Enter the ‘From’ date in the correct format',
      ['Day', 'Year']
    ],
    [
      'a day that cannot exist',
      ['31', '2', '2026'],
      '‘From’ date must be a real date',
      all
    ],
    ['month 13', ['1', '13', '2026'], '‘From’ date must be a real date', all],
    ['day 0', ['0', '1', '2026'], '‘From’ date must be a real date', all],
    [
      'a date in the future',
      ['31', '10', '2026'],
      '‘From’ date must be today or in the past',
      all
    ]
  ])('Should give the From date error for %s', (_, from, text, parts) => {
    expect(readRegistrationDates(query(from, valid), now)).toEqual({
      errors: { 'date-from': { text, parts } }
    })
  })

  test('Should give an error for each date, From first', () => {
    const { errors } = readRegistrationDates(
      query(['1', '', '2026'], ['1', '10', '26']),
      now
    )

    expect(errors).toEqual({
      'date-from': {
        text: '‘From’ date must include a month',
        parts: ['Month']
      },
      'date-to': {
        text: 'Enter the ‘To’ date in the correct format',
        parts: ['Year']
      }
    })
    expect(Object.keys(errors)).toEqual(['date-from', 'date-to'])
  })

  test('Should name the From date when the To date is before it', () => {
    expect(
      readRegistrationDates(query(['3', '3', '2026'], ['2', '3', '2026']), now)
    ).toEqual({
      errors: {
        'date-to': {
          text: '‘To’ date must be the same as or after 3 March 2026',
          parts: all
        }
      }
    })
  })

  test('Should only say the To date is before the From date when it has no other error', () => {
    expect(
      readRegistrationDates(query(['3', '3', '2026'], ['2', '3', '26']), now)
        .errors['date-to'].text
    ).toEqual('Enter the ‘To’ date in the correct format')
  })

  test('Should not compare the dates when the From date is wrong', () => {
    expect(
      readRegistrationDates(query(['31', '2', '2026'], ['1', '1', '2026']), now)
        .errors
    ).not.toHaveProperty('date-to')
  })
})
