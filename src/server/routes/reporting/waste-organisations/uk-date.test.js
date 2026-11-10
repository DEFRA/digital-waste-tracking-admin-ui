import { ukDateOf } from './uk-date.js'

describe('#ukDateOf', () => {
  test.each([
    [
      'in summer, when the UK is an hour ahead',
      '2026-07-01T23:30:00Z',
      '2026-07-02T00:00:00Z'
    ],
    [
      'in summer, before UK midnight',
      '2026-07-01T22:30:00Z',
      '2026-07-01T00:00:00Z'
    ],
    [
      'in winter, when the UK is on UTC',
      '2026-12-01T23:30:00Z',
      '2026-12-01T00:00:00Z'
    ]
  ])('Should give the UK date %s', (_, time, ukDate) => {
    expect(ukDateOf(time)).toEqual(new Date(ukDate))
  })

  test('Should accept a Date', () => {
    expect(ukDateOf(new Date('2026-07-01T23:30:00Z'))).toEqual(
      new Date('2026-07-02T00:00:00Z')
    )
  })
})
