import { safeRedirectPath } from './safe-redirect-path.js'

describe('#safeRedirectPath', () => {
  test.each([
    '/',
    '/software-providers',
    '/software-providers/abc123?tab=secrets'
  ])('Should keep a path on this site: %s', (path) => {
    expect(safeRedirectPath(path)).toEqual(path)
  })

  test.each([
    ['another site', 'https://example.com/'],
    ['a protocol-relative address', '//example.com/'],
    ['a backslash, which browsers read as a slash', '/\\example.com/'],
    ['a relative path', 'software-providers'],
    ['a script', 'javascript:alert(1)'],
    ['nothing', undefined],
    ['an array, as a repeated query parameter gives', ['/a', '/b']]
  ])('Should not redirect to %s', (_, path) => {
    expect(safeRedirectPath(path)).toEqual('/')
  })

  test('Should use the fallback given', () => {
    expect(safeRedirectPath('//example.com', '/software-providers')).toEqual(
      '/software-providers'
    )
  })
})
