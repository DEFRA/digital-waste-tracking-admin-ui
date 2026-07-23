import { validateData } from '#/server/common/helpers/validate-data.js'
import { loginPayloadSchema } from '#/server/routes/login/schema.js'

const USERNAME_PASSWORD_ERROR_MESSAGE = 'Enter a correct username and password'

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User Login',
  heading: 'User Login',
  serviceName: 'DWT Admin Portal',
  breadcrumbs: [{ text: 'Login', href: '/login' }]
}

export const loginViewController = {
  handler(request, h) {
    return h.view('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: request.query.redirectTo ?? '/'
    })
  }
}

export const loginSubmitController = {
  async handler(request, h) {
    const { username, password, redirectTo } = request.payload

    let errors = validateData(request.payload, loginPayloadSchema)

    if (!errors) {
      const encoded = Buffer.from(`${username}:${password}`).toString('base64')
      request.headers.authorization = `Basic ${encoded}`

      try {
        // test the authentication with the credentials to verify they are valid, using the hapi
        // configured auth strategy
        await request.server.auth.test('basic', request)

        // On success set cookie for the user and redirect to the page they were trying to access before being redirected to login
        return h
          .response()
          .state('dwtAuth', { authorization: `Basic ${encoded}` })
          .redirect(redirectTo || '/')
      } catch (err) {
        errors = {
          username: USERNAME_PASSWORD_ERROR_MESSAGE,
          password: USERNAME_PASSWORD_ERROR_MESSAGE
        }
      }
    }

    return h
      .view('login/index', {
        ...LOGIN_VIEW_CONTEXT,
        redirectTo: redirectTo || '/',
        errors
      })
      .code(401)
  }
}
