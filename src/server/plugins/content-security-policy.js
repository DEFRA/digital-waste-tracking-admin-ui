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
      "form-action 'self'",
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
