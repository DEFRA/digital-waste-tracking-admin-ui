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
        text: 'DWT Admin Portal',
        href: '/'
      },
      {
        current: false,
        href: '/reporting/waste-organisations',
        text: 'Reporting'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      {
        current: true,
        text: 'DWT Admin Portal',
        href: '/'
      },
      {
        current: false,
        href: '/reporting/waste-organisations',
        text: 'Reporting'
      }
    ])
  })
})
