export function buildNavigation(request) {
  return [
    {
      text: 'DWT Admin Portal',
      href: '/',
      current: request?.path === '/'
    }
  ]
}
