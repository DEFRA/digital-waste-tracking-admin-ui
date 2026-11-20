import { paths } from '#/server/common/constants/paths.js'
import { serviceErrorAlert } from '#/server/common/constants/service-error.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { createClientCredentials } from '#/server/common/helpers/create-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { validateData } from '#/server/common/helpers/validate-data.js'
import { createClientCredentialsSchema } from './schema.js'

const createAction = 'created new credentials'

const duplicateNameError =
  'A client with this name already exists. Enter a different client name'

/**
 * @param {object} [options]
 * @param {string} [options.clientName] - What the user typed
 * @param {object} [options.errors] - The errors, by field
 * @param {{title: string, text: string}} [options.serviceError] - Why nothing
 * was created, when it wasn't the name
 * @returns {object} The name page's view context
 */
function nameViewContext({ clientName, errors, serviceError } = {}) {
  return {
    pageTitle: 'What is the name of the software provider and package?',
    caption: `Create ${environmentName().toLowerCase()} environment credentials`,
    softwareProvidersPath: paths.softwareProviders,
    clientName,
    errors,
    serviceError
  }
}

export const createClientCredentialsViewController = {
  handler(_request, h) {
    return h.view('software-providers/create/index', nameViewContext())
  }
}

/**
 * Creates the client, then shows its secret once, from the store.
 * @param {import('#/server/common/helpers/new-client-credentials-store.js').NewClientCredentialsStore} store - The store the new secret is kept in until it's shown
 * @returns {{ handler: (request: import('@hapi/hapi').Request, h: import('@hapi/hapi').ResponseToolkit) => Promise<import('@hapi/hapi').ResponseObject> }} The route's handler
 */
export function createClientCredentialsSubmitController(store) {
  return {
    async handler(request, h) {
      const errors = validateData(
        request.payload,
        createClientCredentialsSchema
      )
      const clientName = request.payload?.clientName?.trim()

      if (errors) {
        return h
          .view(
            'software-providers/create/index',
            nameViewContext({ clientName: request.payload?.clientName, errors })
          )
          .code(400)
      }

      let result
      try {
        result = await createClientCredentials(clientName)
      } catch (err) {
        // Any other error is recorded as unknown, to be safe
        const outcome = err.outcome ?? 'unknown'
        auditWriteAction(request, {
          action: createAction,
          outcome,
          client: { clientId: err.clientId, clientName }
        })

        // Nothing was created, so they can just try again. When it may have
        // been, saying so could be wrong
        if (outcome === 'failure') {
          return h
            .view(
              'software-providers/create/index',
              nameViewContext({
                clientName,
                serviceError: serviceErrorAlert('create')
              })
            )
            .code(statusCodes.badGateway)
        }

        throw err
      }

      if (result.isDuplicate) {
        auditWriteAction(request, {
          action: createAction,
          outcome: 'failure',
          client: { clientName }
        })

        return h
          .view(
            'software-providers/create/index',
            nameViewContext({
              clientName,
              errors: { clientName: duplicateNameError }
            })
          )
          .code(409)
      }

      // Who created which client, never the secret
      auditWriteAction(request, {
        action: createAction,
        outcome: 'success',
        client: { clientId: result.credentials.clientId, clientName }
      })

      const id = await store.save(request, {
        ...result.credentials,
        generatedOn: new Date().toISOString()
      })

      return h.redirect(`${paths.newClientCredentials}/${id}`)
    }
  }
}
