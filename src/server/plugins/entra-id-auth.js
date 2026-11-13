import authCookie from '@hapi/cookie'
import {
  WebIdentityTokenProvider,
  hapiAuthOidcPlugin,
  MockProvider
} from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import { saveUserSession } from '#/server/common/helpers/save-user-session.js'

const SESSION_STRATEGY_NAME = 'entra-session'
const SESSION_COOKIE_NAME = 'userSessionCookie'
const SESSION_CACHE_SEGMENT = 'user-session'

function getRequiredConfig(path) {
  const value = config.get(path)

  if (!value) {
    throw new Error(`Missing required config: ${path}`)
  }

  return value
}

/* -------------------------------------------------------------------------- */
/* Auth providers                                                             */
/* -------------------------------------------------------------------------- */

function createFederatedProvider() {
  if (config.get('auth.federatedCredentials.enableMocking')) {
    return new MockProvider({})
  }

  return new WebIdentityTokenProvider({
    audience: getRequiredConfig('auth.federatedCredentials.audience')
  })
}

function createClientSecretProvider() {
  return {
    type: 'client_secret',
    async getCredentials() {
      return getRequiredConfig('auth.oidc.clientSecret')
    }
  }
}

function createLocalStubProvider() {
  return new MockProvider({
    type: 'client_secret',
    token: getRequiredConfig('auth.oidc.clientSecret')
  })
}

/**
 * - http:// discovery URI (local stub)  -> mock provider using the client secret
 * - mocking enabled, or production      -> federated credentials (mock or real)
 * - anything else (non-prod)            -> plain client secret
 */
function selectAuthProvider(discoveryUri) {
  if (discoveryUri.startsWith('http://')) {
    return createLocalStubProvider()
  }

  const useFederated =
    config.get('auth.federatedCredentials.enableMocking') ||
    config.get('isProduction')

  return useFederated ? createFederatedProvider() : createClientSecretProvider()
}

/* -------------------------------------------------------------------------- */
/* Session handling                                                           */
/* -------------------------------------------------------------------------- */

function registerSessionCache(server) {
  const cache = server.cache({
    cache: config.get('session.cache.name'),
    segment: SESSION_CACHE_SEGMENT,
    expiresIn: config.get('session.cache.ttl')
  })

  server.decorate('server', 'sessionCache', {
    get: (sessionId) => cache.get(sessionId),
    set: (sessionId, session) => cache.set(sessionId, session),
    drop: (sessionId) => cache.drop(sessionId)
  })
}

function clearSessionCookie(request) {
  if (!request.sessionCookie?.h) {
    return
  }

  request.sessionCookie.clear()
  request.sessionCookie.h.unstate(SESSION_COOKIE_NAME)
}

function createSessionValidator(server) {
  return async function validate(request, session) {
    const sessionId = session?.sessionId

    if (!sessionId) {
      return { isValid: false }
    }

    const currentSession = await server.sessionCache.get(sessionId)

    if (!currentSession?.isAuthenticated) {
      return { isValid: false }
    }

    let credentials = currentSession

    try {
      const { token, refreshed } =
        await request.ensureValidToken(currentSession)

      if (refreshed) {
        request.logger.info(`Refreshing session: ${sessionId}`)
        credentials = await saveUserSession(request, sessionId, token)
      }
    } catch (err) {
      request.logger.warn(
        { err },
        `Dropping session ${sessionId}: token validation failed`
      )
      await server.sessionCache.drop(sessionId)
      clearSessionCookie(request)
      return { isValid: false }
    }

    return { isValid: true, credentials }
  }
}

function registerSessionStrategy(server) {
  const { password, secure, ttl } = config.get('session.cookie')

  server.auth.strategy(SESSION_STRATEGY_NAME, 'cookie', {
    cookie: {
      name: SESSION_COOKIE_NAME,
      path: '/',
      password,
      isSecure: secure,
      ttl,
      clearInvalid: true
    },
    keepAlive: true,
    requestDecoratorName: 'sessionCookie',
    validate: createSessionValidator(server)
  })
}

/* -------------------------------------------------------------------------- */
/* Plugin                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Registers the Entra OIDC login strategy and a session-backed strategy
 * used as the default auth method after a successful login.
 *
 * @satisfies {import('@hapi/hapi').Plugin}
 */
export const entraIdAuth = {
  plugin: {
    name: 'entra-id-auth',
    async register(server) {
      const { oidc, cookieOptions } = config.get('auth')

      // The secret and auth method are handled by the auth provider, so they
      // are not passed through to the OIDC plugin
      const {
        clientSecret: _clientSecret,
        tokenEndpointAuthMethod: _tokenEndpointAuthMethod,
        ...oidcPluginConfig
      } = oidc

      registerSessionCache(server)

      await server.register({
        plugin: hapiAuthOidcPlugin,
        options: {
          oidc: {
            ...oidcPluginConfig,
            authProvider: selectAuthProvider(oidc.discoveryUri)
          },
          cookieOptions
        }
      })

      await server.register(authCookie)

      registerSessionStrategy(server)
    }
  }
}
