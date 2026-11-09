import Joi from 'joi'

import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { getClient } from '#/server/common/helpers/get-client.js'


const replaceAction = 'replaced software provider'

// Cognito's client ids. Anything else can't be a client, so goes to the list,
// as a deleted client does
const options = {
  validate: {
    params: Joi.object({
      clientId: Joi.string()
        .pattern(/^[\w+]+$/)
        .required()
    }),
    failAction: (_request, h) => h.redirect(paths.softwareProviders).takeover()
  }
}

export const replaceClientCredentialsController = {
  options,
  async handler(request, h) {
    const client = await getClient(request.params.clientId)

    if (!client) {
      return h.redirect(paths.softwareProviders)
    }

    const credentials = await getClientCredentialsById(request.params.clientId)

    const { clientName } = credentials

    return h.view('software-providers/client/replace/index', {
      pageTitle: 'Replace the client secret',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      softwareProviderPath: clientPath(paths.softwareProvider, client.clientId)
    })
  }
}
