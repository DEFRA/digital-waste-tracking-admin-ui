import { paths } from '#/server/common/constants/paths.js'

/**
 * The navigation links on every page, with the one for the page being
 * requested marked as current.
 * @param {import('@hapi/hapi').Request} [request] - The request, if there is one
 * @returns {{ text: string, href: string, current: boolean }[]} The links
 */
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
      text: 'Waste organisations',
      href: '/reporting/waste-organisations',
      current: request?.path === '/reporting/waste-organisations'
    }
  ]
}
