import Joi from 'joi'

import { clientPath, paths } from '#/server/common/constants/paths.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'
import { getClient } from '#/server/common/helpers/get-client.js'
import { securityTeamEmail } from '#/server/common/helpers/security-team-email.js'
import { replaceClientCredential } from '#/server/common/helpers/replace-client-credential.js'

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

    // Don't allow the 'replace' operation to be run
    // on clients with 0 or 2 secrets
    if (client.secrets?.length !== 1) {
      return h.redirect(
        clientPath(paths.softwareProvider, request.params.clientId)
      )
    }

    return h.view('software-providers/client/replace/index', {
      pageTitle: 'Replace the client secret',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName: client.clientName,
      softwareProviderPath: clientPath(paths.softwareProvider, client.clientId),
      securityTeamEmail: securityTeamEmail({
        clientId: client.clientId,
        clientName: client.clientName
      })
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
        result = await replaceClientCredential(clientId)
      } catch (err) {
        const outcome = err.outcome ?? 'unknown'
        auditWriteAction(request, {
          action: replaceAction,
          outcome,
          client: { clientId, clientName: client.clientName }
        })

        if (outcome === 'unknown') {
          request.yar.flash(
            flashKeys.uncertainClientChange,
            `Replacing the secret for ${client.clientName} may have worked. Check the client secrets below before trying again.`
          )
          return h.redirect(clientPath(paths.softwareProvider, clientId))
        }

        throw err
      }

      // Replaced since it was looked up, as by someone else
      if (result.isNotFound) {
        auditWriteAction(request, {
          action: replaceAction,
          outcome: 'failure',
          client: { clientId, clientName: client.clientName }
        })
        return h.redirect(paths.softwareProviders)
      }

      // Another client has the name, or this one is out of date: nothing changed
      if (result.isConflict) {
        auditWriteAction(request, {
          action: replaceAction,
          outcome: 'failure',
          client: { clientId, clientName: client.clientName }
        })
        request.yar.flash(
          flashKeys.conflictedClientChange,
          `No secret was replaced for ${client.clientName}: the client is out of date, or another client has its name. Contact the DWT team before trying again.`
        )
        return h.redirect(clientPath(paths.softwareProvider, clientId))
      }

      const outcome = result.outcome ?? 'success'

      auditWriteAction(request, {
        action: replaceAction,
        outcome,
        client: { clientId, clientName: client.clientName }
      })

      const id = await store.save(request, {
        ...result.credentials,
        clientName: client.clientName,
        generatedOn: new Date().toISOString(),
        isPartialReplace: outcome !== 'success' // Used to warn when the old secret may still be active
      })

      return h.redirect(`${paths.newClientCredentials}/${id}`)
    }
  }
}
