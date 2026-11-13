import {
  replaceClientCredentialsController,
  replaceClientCredentialsSubmitController
} from './controller.js'
import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'
import { createNewClientCredentialsStore } from '#/server/common/helpers/new-client-credentials-store.js'

/**
 * Sets up the routes used in the /software-providers/{clientId}/replace pages.
 * These routes are registered in src/server/router.js.
 */
export const replaceSecret = {
  plugin: {
    name: 'replace-secret',
    register(server) {
      if (!config.get('clientCredentials.createEnabled')) {
        return
      }

      const newClientCredentialsStore = createNewClientCredentialsStore(server)

      server.route([
        {
          method: 'GET',
          path: paths.replaceClientCredentials,
          ...replaceClientCredentialsController
        },
        {
          method: 'POST',
          path: paths.replaceClientCredentials,
          ...replaceClientCredentialsSubmitController(newClientCredentialsStore)
        }
      ])
    }
  }
}
