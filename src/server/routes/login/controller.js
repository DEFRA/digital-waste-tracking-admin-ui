const USERNAME_PASSWORD_ERROR_MESSAGE = 'Enter a correct username and password'

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User Login',
  heading: 'User Login',
  serviceName: 'DWT Admin Portal',
  breadcrumbs: [{ text: 'Login', href: '/login' }]
}

// Open login page with the path to redirect the user back to
// where they came from once auth is successful
export const loginViewController = {
  handler(request, h) {
    return h.view('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: request.query.redirectTo ?? '/'
    })
  }
}

// Form submit.
export const loginSubmitController = {
  async handler(request, h) {
    const { username, password, redirectTo } = request.payload
    const encoded = Buffer.from(`${username}:${password}`).toString('base64')
    request.headers.authorization = `Basic ${encoded}`

    try {
      // test the authentication with the credentials to verify they are valid, using the hapi
      // configured auth strategy
      await request.server.auth.test('basic', request)
    } catch (err) {
      // On error log error message, don't allude to if it was the username or password
      // that was incorrect, just say they were invalid
      return h
        .view('login/index', {
          ...LOGIN_VIEW_CONTEXT,
          redirectTo: redirectTo || '/',
          errors: {
            username: USERNAME_PASSWORD_ERROR_MESSAGE,
            password: USERNAME_PASSWORD_ERROR_MESSAGE
          },
          errorList: [
            { text: USERNAME_PASSWORD_ERROR_MESSAGE, href: '#username' }
          ]
        })
        .code(401)
    }

    // On success set cookie for the user and redirect to the page they were trying to access before being redirected to login
    return h
      .response()
      .state('dwtAuth', { authorization: `Basic ${encoded}` })
      .redirect(redirectTo || '/')
  },

  // Joi validation on the login form payload, if it fails this function is called to handle the error and return the user to the login page with the errors displayed
  failAction(request, h, error) {
    const errors = {}
    const errorList = []

    for (const {
      path: [field],
      message
    } of error.details) {
      errors[field] = message
      errorList.push({ text: message, href: `#${field}` })
    }

    return h
      .view('login/index', {
        ...LOGIN_VIEW_CONTEXT,
        redirectTo: request.payload?.redirectTo ?? '/',
        errors,
        errorList
      })
      .takeover()
      .code(400)
  }
}
