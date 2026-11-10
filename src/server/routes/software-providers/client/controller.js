import { config } from '#/config/config.js'
import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export const clientCredentialsSoftwareProviderDetailController = {
  options: {
    cache: {
      otherwise: 'no-store'
    }
  },
  async handler(request, h) {
    // /software-providers/{clientId} must not shadow the /software-providers/create
    // route, which is not registered when client credential creation is switched off
    if (request.path === paths.createClientCredentials) {
      return h.response().code(404)
    }

    const credentials = await getClientCredentialsById(request.params.clientId)

    // Only straight after a removal: reading the flash clears it
    const [removedSecret] = request.yar.flash(flashKeys.removedClientSecret)

    const { secrets = [] } = credentials ?? {}
    const { clientId, clientName } = credentials ?? {}

    // Youngest first, as the newest secret is the one in use. Only a client
    // with two secrets can have its older one removed, and only a client with
    // one secret can be given another
    const { length: secretCount } = secrets

    // return h.view('client-credentials/software-provider-detail/index', {
    return h.view('software-providers/client/index', {
      pageTitle: clientName,
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      clientId,
      secrets,
      secretCount,
      removedSecret,
      replaceSecretPath:
        secretCount === 1
          ? clientPath(paths.replaceClientCredentials, clientId)
          : null,
      addSecretPath:
        secretCount === 1
          ? clientPath(paths.addClientCredentials, clientId)
          : null,
      removeSecretPath:
        secretCount > 1
          ? clientPath(paths.removeClientCredentials, clientId)
          : null,
      softwareProvidersPath: paths.softwareProviders,
      // Deleting can be switched off, as it is in production for now, and its
      // page then doesn't exist
      deleteSoftwareProviderPath: config.get('clientCredentials.deleteEnabled')
        ? clientPath(paths.deleteSoftwareProvider, clientId)
        : null,
      environment: capitalise(`${environmentName()} environment`)
    })
  }
}
