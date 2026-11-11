import { config } from '#/config/config.js'
import Joi from 'joi'

import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export const clientCredentialsSoftwareProviderDetailController = {
  options: {
    validate: {
      params: Joi.object({
        clientId: Joi.string()
          .pattern(/^[\w+]+$/)
          .required()
      }),
      failAction: (_request, h) =>
        h.redirect(paths.softwareProviders).takeover()
    },
    cache: {
      otherwise: 'no-store'
    }
  },
  async handler(request, h) {
    // /software-providers/{clientId} must not shadow the /software-providers/create
    // route, which is not registered when client credential creation is switched off
    if (request.path === paths.createClientCredentials) {
      return h.response().code(statusCodes.notFound)
    }

    const credentials = await getClientCredentialsById(request.params.clientId)

    // Deleted, as by someone else, or never existed
    if (!credentials) {
      return h.redirect(paths.softwareProviders)
    }

    const [removedSecret] = request.yar.flash(flashKeys.removedClientSecret)
    const [uncertainChange] = request.yar.flash(flashKeys.uncertainClientChange)

    const { secrets = [] } = credentials
    const { clientId, clientName } = credentials

    // Youngest first, as the newest secret is the one in use. Only a client
    // with two secrets can have its older one removed, and only a client with
    // one secret can be given another
    const { length: secretCount } = secrets

    const secretsEnabled = config.get('clientCredentials.createEnabled')

    return h.view('software-providers/client/index', {
      pageTitle: clientName,
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      clientId,
      secrets,
      secretCount,
      removedSecret,
      uncertainChange,
      replaceSecretPath:
        secretsEnabled && secretCount === 1
          ? clientPath(paths.replaceClientCredentials, clientId)
          : null,
      addSecretPath:
        secretsEnabled && secretCount === 1
          ? clientPath(paths.addClientCredentials, clientId)
          : null,
      removeSecretPath:
        secretsEnabled && secretCount > 1
          ? clientPath(paths.removeClientCredentials, clientId)
          : null,
      softwareProvidersPath: paths.softwareProviders,
      deleteSoftwareProviderPath: config.get('clientCredentials.deleteEnabled')
        ? clientPath(paths.deleteSoftwareProvider, clientId)
        : null,
      environment: capitalise(`${environmentName()} environment`)
    })
  }
}
