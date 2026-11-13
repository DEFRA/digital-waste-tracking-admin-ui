import { config } from '#/config/config.js'
import { getClientCredentials } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'

/**
 * Orders client credentials by client name, then by client ID so that clients
 * with the same name stay in the same order. A fixed locale keeps the order the
 * same wherever the portal runs.
 *
 * @param {{ clientName: String, clientId: String }} a
 * @param {{ clientName: String, clientId: String }} b
 *
 * @returns {Number} The sort order
 */
function byClientName(a, b) {
  return (
    a.clientName.localeCompare(b.clientName, 'en-GB', {
      sensitivity: 'base'
    }) || a.clientId.localeCompare(b.clientId, 'en-GB')
  )
}

export const softwareProvidersController = {
  async handler(request, h) {
    const environment = environmentName()
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
      deletedClientName
    })
  }
}
