import {
  removeClientCredentialsController,
  removeClientCredentialsSubmitController
} from './controller.js'
import { paths } from '#/server/common/constants/paths.js'

/**
 * Sets up the routes used in the /software-providers/{clientId}/remove pages.
 * These routes are registered in src/server/router.js.
 */
export const removeSecret = {
  plugin: {
    name: 'remove-secret',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.removeClientCredentials,
          ...removeClientCredentialsController
        },
        {
          method: 'POST',
          path: paths.removeClientCredentials,
          ...removeClientCredentialsSubmitController
        }
      ])
    }
  }
}
