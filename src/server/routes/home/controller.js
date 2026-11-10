/**
 * A GDS styled example home page controller.
 * Provided as an example, remove or modify as required.
 */
export const homeController = {
  handler(request, h) {
    const credentials = request.auth?.credentials ?? {}
    const signedInUser = {
      name: credentials.displayName ?? credentials.username ?? 'Unknown user',
      email: credentials.email ?? credentials.username ?? ''
    }

    return h.view('home/index', {
      pageTitle: 'Home',
      heading: 'DWT admin portal',
      serviceName: 'DWT admin portal',
      signedInUser
    })
  }
}
