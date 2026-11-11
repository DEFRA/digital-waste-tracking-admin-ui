import {
  removeClientCredentialsController,
  removeClientCredentialsSubmitController
} from './controller.js'
import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'

/**
 * Sets up the routes used in the /software-providers/{clientId}/remove pages.
 * These routes are registered in src/server/router.js.
 */
export const removeSecret = {
  plugin: {
    name: 'remove-secret',
    register(server) {
      if (!config.get('clientCredentials.createEnabled')) {
        return
      }

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
