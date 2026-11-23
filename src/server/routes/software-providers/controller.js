import { config } from '#/config/config.js'
import { getClientCredentials } from '#/server/common/helpers/get-client-credentials.js'
import {
  environmentName,
  environmentLabels
} from '#/server/common/helpers/environment.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'

/**
 * Orders client credentials by client name, then by client ID so that clients
 * with the same name stay in the same order. A fixed locale keeps the order the
 * same wherever the portal runs.
 * @param {{clientName: string, clientId: string}} a - A client to order
 * @param {{clientName: string, clientId: string}} b - Another client to order
 * @returns {number} The sort order
 */
function byClientName(a, b) {
  return (
    a.clientName.localeCompare(b.clientName, 'en-GB', {
      sensitivity: 'base'
    }) || a.clientId.localeCompare(b.clientId, 'en-GB')
  )
}

// The environment to switch to from each environment, and the config key for
// its base URL
const otherEnvironments = {
  local: { environment: 'dev', urlConfig: 'environmentLinks.dev' },
  dev: { environment: 'test', urlConfig: 'environmentLinks.test' },
  test: { environment: 'perf-test', urlConfig: 'environmentLinks.perfTest' },
  'perf-test': {
    environment: 'ext-test',
    urlConfig: 'environmentLinks.extTest'
  },
  'ext-test': { environment: 'prod', urlConfig: 'environmentLinks.prod' },
  prod: { environment: 'ext-test', urlConfig: 'environmentLinks.extTest' }
}

export const softwareProvidersController = {
  async handler(request, h) {
    const environment = environmentName()
    const otherEnvironment = otherEnvironments[config.get('cdpEnvironment')]
    // Only straight after a deletion: reading the flash clears it
    const [deletedClientName] = request.yar.flash(
      flashKeys.deletedSoftwareProvider
    )

    // Sorted here as well as by the sortable table's script, so the table is
    // in order without JavaScript
    const clientCredentials = (await getClientCredentials())
      .map(({ clientName, clientId }) => ({
        clientName: clientName ?? '',
        clientId: clientId ?? '',
        softwareProviderPath: clientPath(paths.softwareProvider, clientId),
        environment
      }))
      .sort(byClientName)

    return h.view('software-providers/index', {
      pageTitle: 'Software providers',
      createClientCredentialsPath: config.get('clientCredentials.createEnabled')
        ? paths.createClientCredentials
        : null,
      clientCredentials,
      deletedClientName,
      otherEnvironment: otherEnvironment
        ? {
            label: environmentLabels[otherEnvironment.environment],
            url: new URL(
              paths.softwareProviders,
              config.get(otherEnvironment.urlConfig)
            ).href
          }
        : null
    })
  }
}
