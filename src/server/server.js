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
import { requestContext } from './plugins/request-context.js'
import { sessionCache } from './plugins/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'
import { entraId, entraStrategy } from './plugins/entra-id.js'
import { paths } from '#/server/common/constants/paths.js'

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
    entraId,
    requestContext,
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  // Not signed in: the sign in page, then back to the page once signed in
  server.ext('onPreResponse', (request, h) => {
    const response = request.response

    if (response.isBoom && response.output.statusCode === 401) {
      // With its query, so a report comes back with its dates
      const page = `${request.path}${request.url.search}`
      return h.redirect(
        `${paths.signIn}?redirectTo=${encodeURIComponent(page)}`
      )
    }

    return h.continue
  })

  server.auth.default(entraStrategy)

  server.ext('onPreResponse', catchAll)

  return server
}
