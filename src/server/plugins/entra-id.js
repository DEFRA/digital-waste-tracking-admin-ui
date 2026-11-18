import Boom from '@hapi/boom'
import {
  hapiAuthOidcPlugin,
  WebIdentityTokenProvider
} from '@defra/hapi-auth-oidc'

import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'

export const entraStrategy = 'entra'

// Who's signed in, in the session (yar, kept server-side)
export const signedInUserKey = 'signedInUser'

/**
 * Signs users in with Microsoft Entra ID, using CDP's @defra/hapi-auth-oidc.
 *
 * The admin UI proves who it is to Entra ID with a federated credential: a
 * short-lived token from AWS STS for its role, which Entra ID trusts, rather
 * than a client secret. Locally, Floci stands in for STS and floci-az for
 * Entra ID (see compose.yml).
 *
 * Once signed in, the user is kept in the session (server-side, see
 * session-cache.js), so Entra ID's tokens aren't kept or refreshed: the
 * sign-in lasts as long as the session does.
 *
 * @satisfies {import('@hapi/hapi').Plugin}
 */
export const entraId = {
  plugin: {
    name: 'entra-id',
    async register(server) {
      const {
        clientId,
        discoveryUri,
        useHttp,
        externalBaseUrl,
        federatedCredentialAudience
      } = config.get('entra')

      if (!clientId || !discoveryUri || !externalBaseUrl) {
        throw new Error(
          'ENTRA_CLIENT_ID, ENTRA_DISCOVERY_URI and APP_BASE_URL must be set'
        )
      }

      const { password, secure } = config.get('session.cookie')

      await server.register({
        plugin: hapiAuthOidcPlugin,
        options: {
          oidc: {
            clientId,
            discoveryUri,
            useHttp,
            externalBaseUrl,
            loginCallbackUri: paths.signInCallback,
            scope: 'openid profile email',
            // Entra ID sends the user back with a redirect rather than a form
            // post, so the Lax session cookie comes back with them
            responseMode: 'query',
            authProvider: new WebIdentityTokenProvider({
              audience: [federatedCredentialAudience]
            })
          },
          // Holds the sign-in's PKCE verifier and state until the callback
          cookieOptions: { password, isSecure: secure, isSameSite: 'Lax' }
        }
      })

      server.auth.scheme('entra-session', () => ({
        authenticate(request, h) {
          const user = request.yar.get(signedInUserKey)

          return user
            ? h.authenticated({ credentials: user })
            : h.unauthenticated(Boom.unauthorized())
        }
      }))

      server.auth.strategy(entraStrategy, 'entra-session')
    }
  }
}
