import { paths } from '#/server/common/constants/paths.js'

export function buildNavigation(request) {
  return [
    {
      text: 'DWT Admin Portal',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'Software providers',
      href: paths.softwareProviders,
      current: request?.path === paths.softwareProviders
    },
    {
      text: 'Reporting',
      href: '/reporting/waste-organisations',
      current: request?.path === '/reporting/waste-organisations'
    }
  ]
}
