import { softwareProviderController } from './controller.js'
import { paths } from '#/server/common/constants/paths.js'

/**
 * Sets up the routes used in the /software-providers/{clientId} pages.
 * These routes are registered in src/server/router.js.
 */
export const softwareProvider = {
  plugin: {
    name: 'client',
    register(server) {
      server.route({
        method: 'GET',
        path: paths.softwareProvider,
        ...softwareProviderController
      })
    }
  }
}
