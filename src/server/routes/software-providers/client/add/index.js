import { addClientCredentialsSubmitController } from './controller.js'
import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'
import { createNewClientCredentialsStore } from '#/server/common/helpers/new-client-credentials-store.js'

/**
 * Sets up the routes used in the /software-providers/{clientId}/add-secret
 * pages. These routes are registered in src/server/router.js.
 */
export const addSecret = {
  plugin: {
    name: 'add-secret',
    register(server) {
      // Adding shows the new secret on the new credentials page, which only
      // exists when creating credentials is switched on. Otherwise it stays
      // "Page not found", as it is in production for now
      if (!config.get('clientCredentials.createEnabled')) {
        return
      }

      const newClientCredentialsStore = createNewClientCredentialsStore(server)

      server.route({
        method: 'POST',
        path: paths.addClientCredentials,
        ...addClientCredentialsSubmitController(newClientCredentialsStore)
      })
    }
  }
}
