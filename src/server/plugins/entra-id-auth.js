import authCookie from '@hapi/cookie'
import {
  WebIdentityTokenProvider,
  hapiAuthOidcPlugin,
  MockProvider
} from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import { saveUserSession } from '#/server/common/helpers/save-user-session.js'

const logFederatedJwtClaims =
  process.env.LOG_FEDERATED_JWT_CLAIMS?.toLowerCase() === 'true'
const logFullFederatedJwt =
  process.env.LOG_FULL_FEDERATED_JWT?.toLowerCase() === 'true'

function getRequiredConfig(path) {
  const value = config.get(path)

  if (!value) {
    throw new Error(`Missing required config: ${path}`)
  }

  return value
}

function createAuthProvider() {
  const federatedCredentials = config.get('auth.federatedCredentials')

  if (federatedCredentials.enableMocking) {
    return new MockProvider({})
  }

  return new WebIdentityTokenProvider({
    audience: getRequiredConfig('auth.federatedCredentials.audience')
  })
}

function createClientSecretProvider() {
  return {
    type: 'client_secret',
    async getCredentials(_logger) {
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

function createDiagnosticAuthProvider(authProvider, fallbackLogger = console) {
  if (!logFederatedJwtClaims && !logFullFederatedJwt) {
    return authProvider
  }

  if (!authProvider || typeof authProvider.getCredentials !== 'function') {
    return authProvider
  }

  const original = authProvider.getCredentials.bind(authProvider)

  authProvider.getCredentials = async (logger) => {
    const result = await original(logger)

    try {
      const log = logger?.info ? logger : fallbackLogger
      const assertion =
        typeof result === 'string'
          ? result
          : (result?.client_assertion ??
            result?.clientAssertion ??
            result?.token)

      const segments = typeof assertion === 'string' ? assertion.split('.') : []
      let claims = null
      if (segments.length === 3) {
        try {
          claims = JSON.parse(
            Buffer.from(segments[1], 'base64url').toString('utf8')
          )
        } catch {}
      }

      log.info(
        {
          length: typeof assertion === 'string' ? assertion.length : null,
          segments: segments.length,
          claims: claims
            ? {
                iss: claims.iss,
                sub: claims.sub,
                aud: claims.aud,
                exp: claims.exp,
                iat: claims.iat,
                nbf: claims.nbf
              }
            : null
        },
        'Federated assertion diagnostics'
      )

      if (logFullFederatedJwt && typeof assertion === 'string') {
        process.stdout.write(`FEDERATED_ASSERTION_JWT=${assertion}\n`)
      }
    } catch (e) {
      fallbackLogger.error({ err: e }, 'Federated assertion diagnostics failed')
    }

    return result
  }

  return authProvider
}

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
      const federatedCredentials = config.get('auth.federatedCredentials')
      const scope = oidc.scope
      const isProduction = config.get('isProduction')
      const isLocalStub = oidc.discoveryUri.startsWith('http://')
      const {
        clientSecret: _clientSecret,
        tokenEndpointAuthMethod: _tokenEndpointAuthMethod,
        ...oidcPluginConfig
      } = oidc

      const oidcOptions = {
        ...oidcPluginConfig,
        scope
      }

      if (isLocalStub) {
        oidcOptions.authProvider = createDiagnosticAuthProvider(
          createLocalStubProvider()
        )
      } else if (federatedCredentials.enableMocking) {
        oidcOptions.authProvider = createDiagnosticAuthProvider(createAuthProvider())
      } else if (isProduction) {
        oidcOptions.authProvider = createDiagnosticAuthProvider(createAuthProvider())
      } else {
        oidcOptions.authProvider = createClientSecretProvider()
      }

      const userSessionCache = server.cache({
        cache: config.get('session.cache.name'),
        segment: 'user-session',
        expiresIn: config.get('session.cache.ttl')
      })

      server.decorate('server', 'sessionCache', {
        get: async (sessionId) => userSessionCache.get(sessionId),
        set: async (sessionId, session) => userSessionCache.set(sessionId, session),
        drop: async (sessionId) => userSessionCache.drop(sessionId)
      })

      await server.register({
        plugin: hapiAuthOidcPlugin,
        options: {
          oidc: oidcOptions,
          cookieOptions
        }
      })

      await server.register(authCookie)

      const sessionCookieConfig = config.get('session.cookie')
      server.auth.strategy('entra-session', 'cookie', {
        cookie: {
          name: 'userSessionCookie',
          path: '/',
          password: sessionCookieConfig.password,
          isSecure: sessionCookieConfig.secure,
          ttl: sessionCookieConfig.ttl,
          clearInvalid: true
        },
        keepAlive: true,
        requestDecoratorName: 'sessionCookie',
        validate: async (request, session) => {
          const sessionId = session?.sessionId

          if (!sessionId) {
            return { isValid: false }
          }

          const currentUserSession = await server.sessionCache.get(sessionId)

          if (!currentUserSession?.isAuthenticated) {
            return { isValid: false }
          }

          let userSession = currentUserSession

          try {
            const { token, refreshed } = await request.ensureValidToken(
              currentUserSession
            )

            if (refreshed) {
              request.logger.info(`Refreshing session: ${sessionId}`)
              userSession = await saveUserSession(request, sessionId, token)
            }
          } catch {
            await server.sessionCache.drop(sessionId)
            if (request.sessionCookie?.h) {
              request.sessionCookie.clear()
              request.sessionCookie.h.unstate('userSessionCookie')
            }
            return { isValid: false }
          }

          return {
            isValid: true,
            credentials: userSession
          }
        }
      })
    }
  }
}
