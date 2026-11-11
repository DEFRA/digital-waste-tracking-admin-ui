import Joi from 'joi'

import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { clientPath, paths } from '#/server/common/constants/paths.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { flashKeys } from '#/server/common/constants/flash-keys.js'
import { getClient } from '#/server/common/helpers/get-client.js'
import { removeClientCredential } from '#/server/common/helpers/remove-client-credential.js'
import { securityTeamEmail } from '#/server/common/helpers/security-team-email.js'

const removeAction = 'removed old client secret'

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
 * Only a client with two secrets has an older one to remove, so both the page
 * and its submission check it still does.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 *
 * @returns {Promise<{ redirect: Object } | { client: Object, credentials: Object }>}
 * A redirect when there's nothing to remove, otherwise the client and its credentials
 */
async function clientToRemove(request, h) {
  const client = await getClient(request.params.clientId)

  // Deleted since it was last seen, as by someone else
  if (!client) {
    return { redirect: h.redirect(paths.softwareProviders) }
  }

  const credentials = await getClientCredentialsById(request.params.clientId)

  // The older secret has gone, as it may have after another admin removed it
  if ((credentials?.secrets?.length ?? 0) < 2) {
    return {
      redirect: h.redirect(
        clientPath(paths.softwareProvider, request.params.clientId)
      )
    }
  }

  return { client, credentials }
}

export const removeClientCredentialsController = {
  options,
  async handler(request, h) {
    const result = await clientToRemove(request, h)

    if (result.redirect) {
      return result.redirect
    }

    const { client, credentials } = result

    // The oldest secret, which is the one removed, as the client page lists them
    const [oldestSecret] = [...credentials.secrets].sort((a, b) =>
      String(a.createdAt).localeCompare(String(b.createdAt))
    )

    return h.view('software-providers/client/remove/index', {
      pageTitle: 'Remove the client secret',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName: credentials.clientName,
      secretGeneratedOn: oldestSecret.createdAt,
      softwareProviderPath: clientPath(paths.softwareProvider, client.clientId),
      securityTeamEmail: securityTeamEmail({
        clientId: client.clientId,
        clientName: credentials.clientName
      })
    })
  }
}

export const removeClientCredentialsSubmitController = {
  options,
  async handler(request, h) {
    const result = await clientToRemove(request, h)

    if (result.redirect) {
      return result.redirect
    }

    const { client, credentials } = result
    const { clientId } = request.params
    const target = { clientId, clientName: client.clientName }

    let removal
    try {
      removal = await removeClientCredential(clientId)
    } catch (err) {
      const outcome = err.outcome ?? 'unknown'
      auditWriteAction(request, {
        action: removeAction,
        outcome,
        client: target
      })

      if (outcome === 'unknown') {
        request.yar.flash(
          flashKeys.uncertainClientChange,
          `Removing the oldest secret for ${client.clientName} may have worked. Check the client secrets below before trying again.`
        )
        return h.redirect(clientPath(paths.softwareProvider, clientId))
      }

      throw err
    }

    // Gone since it was looked up, as by someone else
    if (removal.isNotFound) {
      auditWriteAction(request, {
        action: removeAction,
        outcome: 'failure',
        client: target
      })
      return h.redirect(paths.softwareProviders)
    }

    // Nothing changed, so nothing was removed
    if (removal.isConflict) {
      auditWriteAction(request, {
        action: removeAction,
        outcome: 'failure',
        client: target
      })
      request.yar.flash(
        flashKeys.conflictedClientChange,
        `No secret was removed for ${client.clientName}: the client is out of date, or another client has its name. Contact the DWT team before trying again.`
      )
      return h.redirect(clientPath(paths.softwareProvider, clientId))
    }

    // Which client's secret was removed, never the secret
    auditWriteAction(request, {
      action: removeAction,
      outcome: 'success',
      client: target
    })

    request.yar.flash(flashKeys.removedClientSecret, {
      clientId,
      clientName: credentials.clientName
    })

    return h.redirect(clientPath(paths.softwareProvider, clientId))
  }
}
