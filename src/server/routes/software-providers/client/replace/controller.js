import Joi from 'joi'

import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { getClient } from '#/server/common/helpers/get-client.js'
import { rotateClientCredential } from '#/server/common/helpers/rotate-client-credential.js'

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

/**
 * @param {ReturnType<import('#/server/common/helpers/new-client-credentials-store.js').createNewClientCredentialsStore>} store
 */
export function replaceClientCredentialsSubmitController(store) {
  return {
    options,
    async handler(request, h) {
      const { clientId } = request.params
      const client = await getClient(clientId)

      // Deleted since it was looked up, as by someone else
      if (!client) {
        return h.redirect(paths.softwareProviders)
      }

      let result
      try {
        result = await rotateClientCredential(clientId)
      } catch (err) {
        // Any other error is recorded as unknown, to be safe
        auditWriteAction(request, {
          action: replaceAction,
          outcome: err.outcome ?? 'unknown',
          client: { clientId, clientName: client.clientName }
        })
        throw err
      }

      if (result.isNotFound) {
        auditWriteAction(request, {
          action: replaceAction,
          outcome: 'failure',
          client: { clientId, clientName: client.clientName }
        })
        return h.redirect(paths.softwareProviders)
      }

      // Who replaced which client's secret, never the secret
      auditWriteAction(request, {
        action: replaceAction,
        outcome: 'success',
        client: { clientId, clientName: client.clientName }
      })

      const id = await store.save(request, {
        ...result.credentials,
        clientName: client.clientName,
        generatedOn: new Date().toISOString()
      })

      return h.redirect(`${paths.newClientCredentials}/${id}`)
    }
  }
}
