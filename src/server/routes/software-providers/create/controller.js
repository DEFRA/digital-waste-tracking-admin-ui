import { audit } from '@defra/cdp-auditing'

import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'
import { createClientCredentials } from '#/server/common/helpers/create-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { validateData } from '#/server/common/helpers/validate-data.js'
import { createClientCredentialsSchema } from './schema.js'

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

      const result = await createClientCredentials(clientName)

      if (result.isDuplicate) {
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

      const { clientId } = result.credentials

      // Who created which client, never the secret
      audit({
        event: 'client-credentials-created',
        user: request.auth.credentials?.username,
        clientId,
        clientName,
        tenantServiceName: config.get('clientCredentials.tenantServiceName')
      })

      const id = await store.save(request, {
        ...result.credentials,
        generatedOn: new Date().toISOString()
      })

      return h.redirect(`${paths.newClientCredentials}/${id}`)
    }
  }
}
