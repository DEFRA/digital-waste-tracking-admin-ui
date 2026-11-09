import Joi from 'joi'

import { flashKeys } from '#/server/common/constants/flash-keys.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { deleteClient } from '#/server/common/helpers/delete-client.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { getClient } from '#/server/common/helpers/get-client.js'

const deleteAction = 'deleted software provider'

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

export const deleteSoftwareProviderViewController = {
  options,
  async handler(request, h) {
    const client = await getClient(request.params.clientId)

    if (!client) {
      return h.redirect(paths.softwareProviders)
    }

    return h.view('software-providers/delete/index', {
      pageTitle: 'Are you sure you want to delete the software provider?',
      clientName: client.clientName,
      environment: `the ${environmentName().toLowerCase()} environment`,
      softwareProviderPath: clientPath(paths.softwareProvider, client.clientId)
    })
  }
}

export const deleteSoftwareProviderSubmitController = {
  options,
  async handler(request, h) {
    const { clientId } = request.params
    const client = await getClient(clientId)

    if (!client) {
      return h.redirect(paths.softwareProviders)
    }

    const target = { clientId, clientName: client.clientName }

    let result
    try {
      result = await deleteClient(clientId)
    } catch (err) {
      // Any other error is recorded as unknown, to be safe
      auditWriteAction(request, {
        action: deleteAction,
        outcome: err.outcome ?? 'unknown',
        client: target
      })
      throw err
    }

    // Deleted since it was looked up, as by someone else
    if (result.isNotFound) {
      auditWriteAction(request, {
        action: deleteAction,
        outcome: 'failure',
        client: target
      })
      return h.redirect(paths.softwareProviders)
    }

    // Who deleted which client
    auditWriteAction(request, {
      action: deleteAction,
      outcome: 'success',
      client: target
    })

    request.yar.flash(flashKeys.deletedSoftwareProvider, client.clientName)

    return h.redirect(paths.softwareProviders)
  }
}
