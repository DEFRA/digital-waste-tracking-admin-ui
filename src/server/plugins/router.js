import inert from '@hapi/inert'

import { home } from '../routes/home/index.js'
import { health } from '../routes/health/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#/config/config.js'
import { reporting } from '../routes/reporting/index.js'
import { wasteOrganisationsReporting } from '../routes/reporting/waste-organisations/index.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([home, reporting, wasteOrganisationsReporting])

      // Static assets
      if (!config.get('isProduction') && !config.get('isTest')) {
        await (async () => {
          const createViteServer = (await import('vite')).createServer
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom'
          })

          server.ext('onPreAuth', (request, h) => {
            // Exclude assets from 'basic' auth strategy (the default)
            if (request.path.startsWith('/public/')) {
              request.route.settings.auth = {
                mode: 'try',
                strategies: []
              }
            }
            return h.continue
          })

          await server.register({
            plugin: (await import('@defra/hapi-connect')).default,
            options: {
              path: '/public',
              middleware: [vite.middlewares]
            }
          })
        })()
      } else {
        server.register(serveStaticFiles)
      }
    }
  }
}
