export function buildNavigation(request) {
  return [
    {
      text: 'DWT Admin Portal',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'Reporting',
      href: '/reporting/waste-organisations',
      current: request?.path === '/reporting/waste-organisations'
    }
  ]
}
