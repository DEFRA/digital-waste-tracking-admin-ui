import { validateData } from '#/server/common/helpers/validate-data.js'
import { loginPayloadSchema } from '#/server/routes/login/schema.js'
import { config } from '#/config/config.js'
import { randomUUID } from 'node:crypto'
import { saveUserSession } from '#/server/common/helpers/save-user-session.js'

const REFERRER_SESSION_KEY = 'authReferrer'
const callbackPath = config.get('auth.oidc.loginCallbackUri')
const OIDC_ERROR_MESSAGE =
  'We could not sign you in with Microsoft Entra ID. Please contact support.'

function getOidcErrorMessage(error) {
  if (config.get('isProduction')) {
    return OIDC_ERROR_MESSAGE
  }

  const detailed =
    error?.data?.error_description ??
    error?.data?.error ??
    error?.message

  return detailed ? `${OIDC_ERROR_MESSAGE}\n\n${detailed}` : OIDC_ERROR_MESSAGE
}

function getRefererAsRelativeURL(referer, defaultPath = '/') {
  let relative = defaultPath

  if (referer) {
    try {
      const url = new URL(referer)
      relative = url.pathname + url.search
    } catch {
      if (referer.startsWith('/')) {
        relative = referer
      }
    }
  }

  if (relative.startsWith(callbackPath)) {
    return defaultPath
  }

  return relative
}

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User login',
  heading: 'User login',
  serviceName: 'DWT admin portal',
  breadcrumbs: [{ text: 'Login', href: '/login' }]
}

export const loginViewController = {
  async handler(request, h) {
    if (config.get('auth.mode') === 'entra') {
      const redirectTo =
        request.query.redirectTo ??
        getRefererAsRelativeURL(request?.info?.referrer, '/')

      request.yar.flash(REFERRER_SESSION_KEY, redirectTo)

      return request.login(h)
    }

    return h.view('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: request.query.redirectTo ?? '/'
    })
  }
}

export const loginSubmitController = {
  async handler(request, h) {
    if (config.get('auth.mode') === 'entra') {
      const redirectTo = request.payload?.redirectTo || '/'
      request.yar.flash(REFERRER_SESSION_KEY, redirectTo)
      return request.login(h)
    }

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
          login: 'Enter a correct username and password'
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

export const entraCallbackController = {
  async handler(request, h) {
    try {
      const credentials = await request.callback(h)

      if (!credentials) {
        return h.response(OIDC_ERROR_MESSAGE).code(401).takeover()
      }

      const sessionId = randomUUID()
      await saveUserSession(request, sessionId, credentials)

      request.sessionCookie.set({ sessionId })

      const redirectTo = request.yar.flash(REFERRER_SESSION_KEY)?.at(0) ?? '/'
      const safeRedirect = redirectTo.replace(/'/g, '%27')

      return h
        .response(
          `<html><head><meta http-equiv="refresh" content="0;URL='${safeRedirect}'"></head><body></body></html>`
        )
        .takeover()
    } catch (error) {
      request.logger?.error(
        {
          error,
          oidcError: {
            message: error?.message,
            statusCode: error?.output?.statusCode,
            data: error?.data
          }
        },
        'OIDC callback failed'
      )
      return h.response(getOidcErrorMessage(error)).code(401).takeover()
    }
  }
}

export const logoutController = {
  async handler(request, h) {
    const sessionId = request.state?.userSessionCookie?.sessionId

    if (sessionId) {
      await request.server.sessionCache.drop(sessionId)
    }

    if (request.sessionCookie?.h) {
      request.sessionCookie.clear()
      request.sessionCookie.h.unstate('userSessionCookie')
    }

    return h.unstate('dwtAuth').redirect('/login')
  }
}

