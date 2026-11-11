import Joi from 'joi'

import { clientPath, paths } from '#/server/common/constants/paths.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { getClient } from '#/server/common/helpers/get-client.js'
import { rotateClientCredential } from '#/server/common/helpers/rotate-client-credential.js'

const addAction = 'added another client secret'

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

/**
 * Adds a second secret, so the client has two. The existing secret keeps
 * working, so there's nothing to confirm first: the new secret is shown
 * straight away, for the software provider to move to.
 *
 * @param {ReturnType<import('#/server/common/helpers/new-client-credentials-store.js').createNewClientCredentialsStore>} store
 */
export function addClientCredentialsSubmitController(store) {
  return {
    options,
    async handler(request, h) {
      const { clientId } = request.params
      const client = await getClient(clientId)

      // Deleted since it was last seen, as by someone else
      if (!client) {
        return h.redirect(paths.softwareProviders)
      }

      // Ensure the secret in use isn't dropped
      if (client.secrets?.length !== 1) {
        return h.redirect(clientPath(paths.softwareProvider, clientId))
      }

      let result
      try {
        result = await rotateClientCredential(clientId)
      } catch (err) {
        const outcome = err.outcome ?? 'unknown'
        auditWriteAction(request, {
          action: addAction,
          outcome,
          client: { clientId, clientName: client.clientName }
        })

        if (outcome === 'unknown') {
          request.yar.flash(
            flashKeys.uncertainClientChange,
            `Adding another secret for ${client.clientName} may have worked. Check the client secrets below before trying again.`
          )
          return h.redirect(clientPath(paths.softwareProvider, clientId))
        }

        throw err
      }

      if (result.isNotFound) {
        auditWriteAction(request, {
          action: addAction,
          outcome: 'failure',
          client: { clientId, clientName: client.clientName }
        })
        return h.redirect(paths.softwareProviders)
      }

      // Who added a secret to which client, never the secret
      auditWriteAction(request, {
        action: addAction,
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
