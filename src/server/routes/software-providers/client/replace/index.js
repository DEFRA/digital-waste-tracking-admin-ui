import { replaceClientCredentialsController } from './controller.js'
import { paths } from '#/server/common/constants/paths.js'

/**
 * Sets up the routes used in the /client-credentials pages.
 * These routes are registered in src/server/router.js.
 */
export const replaceSecret = {
  plugin: {
    name: 'replace-secret',
    register(server) {
      server.route({
        method: 'GET',
        path: paths.replaceClientCredentials,
        ...replaceClientCredentialsController
      })
    }
  }
}
