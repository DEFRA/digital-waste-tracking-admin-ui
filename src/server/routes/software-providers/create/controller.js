import { paths } from '#/server/common/constants/paths.js'
import { auditWriteAction } from '#/server/common/helpers/audit-write-action.js'
import { createClientCredentials } from '#/server/common/helpers/create-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { validateData } from '#/server/common/helpers/validate-data.js'
import { createClientCredentialsSchema } from './schema.js'

const createAction = 'created new credentials'

const duplicateNameError =
  'A client with this name already exists. Enter a different client name'

/**
 * @param {Object} [options]
 * @param {String} [options.clientName] - What the user typed
 * @param {Object} [options.errors] - The errors, by field
 *
 * @returns {Object} The name page's view context
 */
function nameViewContext({ clientName, errors } = {}) {
  return {
    pageTitle: 'What is the name of the software provider and package?',
    caption: `Create ${environmentName().toLowerCase()} environment credentials`,
    softwareProvidersPath: paths.softwareProviders,
    clientName,
    errors
  }
}

export const createClientCredentialsViewController = {
  handler(_request, h) {
    return h.view('software-providers/create/index', nameViewContext())
  }
}

/**
 * @param {ReturnType<import('#/server/common/helpers/new-client-credentials-store.js').createNewClientCredentialsStore>} store
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
        // Only a refusal means nothing was created. Otherwise the client may
        // exist, so it isn't recorded as a failure
        auditWriteAction(request, {
          action: createAction,
          outcome: err.outcomeUnknown === false ? 'failure' : 'unknown',
          client: { clientName }
        })
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
