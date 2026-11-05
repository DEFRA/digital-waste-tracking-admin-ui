import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { paths } from '#/server/common/constants/paths.js'

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export const clientCredentialsSoftwareProviderDetailController = {
  options: {
    cache: {
      otherwise: 'no-store'
    }
  },
  async handler(request, h) {
    const credentials = await getClientCredentialsById(request.params.clientId)

    const { clientId, clientName, secrets } = credentials

    // We also need to get the secret info
    // How do we go about that?

    // Shown once: coming back to the page goes to the Software providers page
    // if (!credentials) {
    //   return h.redirect(paths.softwareProviders)
    // }
    //
    console.log('credentials', credentials)

    return h.view('client-credentials/software-provider-detail/index', {
      pageTitle: 'Client credentials: Software provider detail',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      clientId,
      environment: capitalise(`${environmentName()} environment`)
    })
  }
}
