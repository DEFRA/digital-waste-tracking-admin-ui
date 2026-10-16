import { softwareProvidersController } from './controller.js'
import {
  createClientCredentialsSubmitController,
  createClientCredentialsViewController
} from './create/controller.js'
import { newClientCredentialsController } from './credentials/controller.js'
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
      const newClientCredentialsStore = createNewClientCredentialsStore(server)

      server.route([
        {
          method: 'GET',
          path: paths.softwareProviders,
          ...softwareProvidersController
        },
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
          path: paths.newClientCredentials,
          ...newClientCredentialsController(newClientCredentialsStore)
        }
      ])
    }
  }
}
