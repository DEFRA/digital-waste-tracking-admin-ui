import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        current: false,
        text: 'DWT admin portal',
        href: '/'
      },
      {
        current: false,
        href: '/software-providers',
        text: 'Software providers'
      },
      {
        current: false,
        href: '/reporting/waste-organisations',
        text: 'Reporting'
      },
      {
        current: false,
        href: '/admin/waste-organisations/spreadsheet',
        text: 'Spreadsheet Administration'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'DWT admin portal',
        href: '/'
      },
      {
        current: false,
        href: '/software-providers',
        text: 'Software providers'
      },
      {
        current: false,
        href: '/reporting/waste-organisations',
        text: 'Reporting'
      },
      {
        current: false,
        href: '/admin/waste-organisations/spreadsheet',
        text: 'Spreadsheet Administration'
      }
    ])
  })

  test.each([
    ['/software-providers', true],
    ['/software-providers/create', true],
    ['/software-providers/credentials/an-id', true],
    ['/software-providers-elsewhere', false]
  ])('Should highlight Software providers for %s: %s', (path, current) => {
    const softwareProviders = buildNavigation(mockRequest({ path })).find(
      ({ text }) => text === 'Software providers'
    )

    expect(softwareProviders.current).toBe(current)
  })
})
