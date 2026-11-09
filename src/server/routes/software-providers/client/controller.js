import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'

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

    const { secrets = [] } = credentials ?? {}
    const { clientId, clientName } = credentials ?? {}

    // The oldest secret is the one due for rotation, so it is the only one
    // that can be replaced
    const [oldestSecret] = [...secrets].sort((a, b) =>
      String(a.createdAt).localeCompare(String(b.createdAt))
    )

    // return h.view('client-credentials/software-provider-detail/index', {
    return h.view('software-providers/client/index', {
      pageTitle: 'Manage client credentials',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      clientId,
      secrets,
      oldestSecret,
      replaceSecretPath: clientPath(paths.replaceClientCredentials, clientId),
      environment: capitalise(`${environmentName()} environment`)
    })
  }
}
