import { reportingController } from './controller.js'

/**
 * Sets up the routes used in the /reporting/waste-waste-organisations page.
 * These routes are registered in src/server/router.js.
 */
export const reporting = {
  plugin: {
    name: 'reporting',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/reporting',
          ...reportingController
        }
      ])
    }
  }
}
