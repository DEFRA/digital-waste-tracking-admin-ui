import { formatGeneratedOn } from './format-generated-on.js'

describe('#formatGeneratedOn', () => {
  test.each([
    [
      '2026-10-15T15:49:00Z',
      '15 October 2026 at 4:49pm',
      'in British Summer Time'
    ],
    [
      '2026-12-01T09:05:00Z',
      '1 December 2026 at 9:05am',
      'in Greenwich Mean Time'
    ],
    ['2026-12-01T00:00:00Z', '1 December 2026 at 12:00am', 'at midnight'],
    ['2026-12-01T12:30:00Z', '1 December 2026 at 12:30pm', 'after midday']
  ])('Should format %s as "%s" %s', (iso, expected) => {
    expect(formatGeneratedOn(new Date(iso))).toEqual(expected)
  })
})
