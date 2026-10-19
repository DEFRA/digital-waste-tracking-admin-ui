import { softwareProvidersController } from './controller.js'
import {
  createClientCredentialsSubmitController,
  createClientCredentialsViewController
} from './create/controller.js'
import { newClientCredentialsController } from './credentials/controller.js'
import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'
import { createNewClientCredentialsStore } from '#/server/common/helpers/new-client-credentials-store.js'

/**
 * Sets up the routes used in the /software-providers pages.
 * These routes are registered in src/server/router.js.
 */
export const softwareProviders = {
  plugin: {
    name: 'software-providers',
    register(server) {
      server.route({
        method: 'GET',
        path: paths.softwareProviders,
        ...softwareProvidersController
      })

      // Creating credentials can be switched off, as it is in production for
      // now. Its pages then don't exist, so they're "Page not found"
      if (!config.get('clientCredentials.createEnabled')) {
        return
      }

      const newClientCredentialsStore = createNewClientCredentialsStore(server)

      server.route([
        {
          method: 'GET',
          path: paths.createClientCredentials,
          ...createClientCredentialsViewController
        },
        {
          method: 'POST',
          path: paths.createClientCredentials,
          ...createClientCredentialsSubmitController(newClientCredentialsStore)
        },
        {
          method: 'GET',
          path: `${paths.newClientCredentials}/{id}`,
          ...newClientCredentialsController(newClientCredentialsStore)
        }
      ])
    }
  }
}
