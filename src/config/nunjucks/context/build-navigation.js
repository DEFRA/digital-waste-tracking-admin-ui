import { paths } from '#/server/common/constants/paths.js'

export function buildNavigation(request) {
  return [
    {
      text: 'DWT admin portal',
      href: '/',
      current: request?.path === '/'
    },
    {
      text: 'Software providers',
      href: paths.softwareProviders,
      // Including the pages under it, such as creating credentials
      current:
        request?.path === paths.softwareProviders ||
        request?.path?.startsWith(`${paths.softwareProviders}/`) === true
    },
    {
      text: 'Reporting',
      href: '/reporting/waste-organisations',
      current: request?.path === '/reporting/waste-organisations'
    }
  ]
}
