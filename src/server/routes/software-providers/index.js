import { softwareProvidersController } from './controller.js'
import { paths } from '#/server/common/constants/paths.js'

/**
 * Sets up the routes used in the /software-providers page.
 * These routes are registered in src/server/router.js.
 */
export const softwareProviders = {
  plugin: {
    name: 'software-providers',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.softwareProviders,
          ...softwareProvidersController
        }
      ])
    }
  }
}
