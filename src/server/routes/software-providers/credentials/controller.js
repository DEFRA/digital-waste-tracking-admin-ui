import { config } from '#/config/config.js'
import { paths } from '#/server/common/constants/paths.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { formatGeneratedOn } from '#/server/common/helpers/format-generated-on.js'

/**
 * @param {ReturnType<import('#/server/common/helpers/new-client-credentials-store.js').createNewClientCredentialsStore>} store
 */
export function newClientCredentialsController(store) {
  return {
    options: {
      // The page shows a client secret
      cache: {
        otherwise: 'no-store'
      }
    },
    async handler(request, h) {
      const credentials = await store.take(request)

      // Shown once: coming back to the page goes to the Software providers page
      if (!credentials) {
        return h.redirect(paths.softwareProviders)
      }

      return h.view('software-providers/credentials/index', {
        pageTitle: 'Copy the client credentials',
        generatedOn: formatGeneratedOn(new Date(credentials.generatedOn)),
        environment: `${environmentName()} environment`,
        apiUrl: config.get('clientCredentials.apiUrl'),
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        softwareProvidersPath: paths.softwareProviders
      })
    }
  }
}
