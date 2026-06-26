import {
  wasteOrgansiationsReportingGetController,
  wasteOrgansiationsReportingPostController
} from './controller.js'

/**
 * Sets up the routes used in the /reporting/waste-waste-organisations page.
 * These routes are registered in src/server/router.js.
 */
export const wasteOrganisationsReporting = {
  plugin: {
    name: 'waste-organisations',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/reporting/waste-organisations',
          ...wasteOrgansiationsReportingGetController
        },
        {
          method: 'POST',
          path: '/reporting/waste-organisations',
          ...wasteOrgansiationsReportingPostController
        }
      ])
    }
  }
}
