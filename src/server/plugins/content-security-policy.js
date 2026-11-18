import { config } from '#/config/config.js'

// Where signing in with Entra ID happens, e.g. https://login.microsoftonline.com
const entraOrigin = () => {
  const discoveryUri = config.get('entra.discoveryUri')
  return discoveryUri ? new URL(discoveryUri).origin : ''
}

const contentSecurityPolicy = {
  name: 'content-security-policy',
  register: (server) => {
    const policy = [
      "default-src 'self'",
      "font-src 'self' data:",
      "connect-src 'self' wss: data:",
      "media-src 'self'",
      "style-src 'self'",
      "script-src 'self' 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
      "img-src 'self' data:",
      "frame-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      // A form sent after the session ends is redirected to sign in again,
      // and form-action covers where a form's response redirects to
      `form-action 'self' ${entraOrigin()}`.trim(),
      "manifest-src 'self'"
    ].join('; ')

    server.ext('onPreResponse', (request, h) => {
      const response = request.response

      if (response && typeof response.header === 'function') {
        response.header('content-security-policy', policy)
      }

      return h.continue
    })
  }
}

export { contentSecurityPolicy }
