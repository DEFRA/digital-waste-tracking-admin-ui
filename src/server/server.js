import path from 'path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'

import { router } from './plugins/router.js'
import { config } from '#/config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '#/config/nunjucks/nunjucks.js'
import { requestTracing } from './plugins/request-tracing.js'
import { requestLogger } from './plugins/request-logger.js'
import { sessionCache } from './plugins/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'
import { basicAuth, getEnvVars } from 'waste-movement-utils'
import { createLogger } from './common/helpers/logging/logger.js'

const logger = createLogger()

export async function createServer() {
  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })

  // Defines how the dwtAuth cookie is encoded/secured.
  server.state('dwtAuth', {
    isSecure: true,
    isHttpOnly: true,
    encoding: 'iron',
    password: config.get('session.cookie.password'),
    clearInvalid: true,
    strictHeader: false
  })

  await server.register([
    requestLogger,
    requestTracing,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy,
    basicAuth(getEnvVars('USER_BASIC_AUTH_'), logger),
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  // use cookie if there is one.
  server.ext('onPreAuth', (request, h) => {
    if (!request.headers.authorization) {
      const stored = request.state?.dwtAuth
      if (stored?.authorization) {
        request.headers.authorization = stored.authorization
      }
    }
    return h.continue
  })

  // Strip WWW-Authenticate (trigger for popup) so the browser never shows its native popup,
  // and send to our own login form instead.
  server.ext('onPreResponse', (request, h) => {
    const response = request.response

    if (response.isBoom && response.output.statusCode === 401) {
      return h.redirect(`/login?redirectTo=${encodeURIComponent(request.path)}`)
    }

    return h.continue
  })

  server.auth.default('basic')

  server.ext('onPreResponse', catchAll)

  return server
}
