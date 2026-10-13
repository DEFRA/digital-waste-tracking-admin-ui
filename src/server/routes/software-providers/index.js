import { softwareProvidersController } from './controller.js'

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
          path: '/software-providers',
          ...softwareProvidersController
        }
      ])
    }
  }
}
