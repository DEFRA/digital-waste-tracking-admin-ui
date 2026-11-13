import { validateData } from '#/server/common/helpers/validate-data.js'
import { loginPayloadSchema } from '#/server/routes/login/schema.js'
import { config } from '#/config/config.js'
import { randomUUID } from 'node:crypto'
import { saveUserSession } from '#/server/common/helpers/save-user-session.js'

const REFERRER_SESSION_KEY = 'authReferrer'
const DEFAULT_REDIRECT_PATH = '/'
const callbackPath = config.get('auth.oidc.loginCallbackUri')
const OIDC_ERROR_MESSAGE =
  'We could not sign you in with Microsoft Entra ID. Please contact support.'
const USERNAME_PASSWORD_ERROR_MESSAGE = 'Enter a correct username and password'

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

function isEntraAuthMode() {
  return config.get('auth.mode') === 'entra'
}

function startEntraLogin(request, h, redirectTo) {
  request.yar.flash(REFERRER_SESSION_KEY, redirectTo)
  return request.login(h)
}

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User login',
  heading: 'User login',
  serviceName: 'DWT admin portal',
  breadcrumbs: [{ text: 'Login', href: '/login' }]
}

export const loginViewController = {
  async handler(request, h) {
    if (isEntraAuthMode()) {
      const redirectTo =
        request.payload?.redirectTo ??
        getRefererAsRelativeURL(
          request.info?.referrer,
          DEFAULT_REDIRECT_PATH
        )

      return startEntraLogin(request, h, redirectTo)
    }

    return h.view('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: request.query.redirectTo ?? DEFAULT_REDIRECT_PATH
    })
  }
}

export const loginSubmitController = {
  async handler(request, h) {
    if (isEntraAuthMode()) {
      const redirectTo = request.payload?.redirectTo || DEFAULT_REDIRECT_PATH
      return startEntraLogin(request, h, redirectTo)
    }

    const { username, password, redirectTo } = request.payload

    let errors = validateData(request.payload, loginPayloadSchema)

    if (!errors) {
      const encoded = Buffer.from(`${username}:${password}`).toString('base64')
      request.headers.authorization = `Basic ${encoded}`

      try {
        await request.server.auth.test('basic', request)

        return h
          .response()
          .state('dwtAuth', { authorization: `Basic ${encoded}` })
          .redirect(redirectTo || DEFAULT_REDIRECT_PATH)
      } catch {
        errors = {
          login: USERNAME_PASSWORD_ERROR_MESSAGE
        }
      }
    }

    return h
      .view('login/index', {
        ...LOGIN_VIEW_CONTEXT,
        redirectTo: redirectTo || DEFAULT_REDIRECT_PATH,
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

      const redirectTo =
        request.yar.flash(REFERRER_SESSION_KEY)?.at(0) ?? DEFAULT_REDIRECT_PATH
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
      if (config.get('isProduction')) {
        return OIDC_ERROR_MESSAGE
      }

      const detailed =
        error?.data?.error_description ?? error?.data?.error ?? error?.message

      const errMsg =  detailed
        ? `${OIDC_ERROR_MESSAGE}\n\n${detailed}`
        : OIDC_ERROR_MESSAGE

      return h.response(errMsg).code(401).takeover()
    }
  }
}
