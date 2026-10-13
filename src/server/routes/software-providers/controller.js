import { config } from '#/config/config.js'
import { getClientCredentials } from '#/server/common/helpers/get-client-credentials.js'

/**
 * Names the environment the portal is running in, as shown in the
 * Environment column.
 *
 * @returns {String} The environment name
 */
function environmentName() {
  return config.get('cdpEnvironment') === 'prod' ? 'Production' : 'Test'
}

export const softwareProvidersController = {
  async handler(_request, h) {
    const environment = environmentName()

    // Sorted here as well as by the sortable table's script, so the table is
    // in order without JavaScript
    const clientCredentials = (await getClientCredentials())
      .map(({ clientName, clientId }) => ({
        clientName,
        clientId,
        environment
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))

    return h.view('software-providers/index', {
      pageTitle: 'Software providers',
      clientCredentials
    })
  }
}
