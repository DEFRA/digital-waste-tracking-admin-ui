import { getClientCredentialsById } from '#/server/common/helpers/get-client-credentials.js'
import { environmentName } from '#/server/common/helpers/environment.js'
import { paths } from '#/server/common/constants/paths.js'

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export const replaceClientCredentialsController = {
  options: {
    cache: {
      otherwise: 'no-store'
    }
  },
  async handler(request, h) {
    const credentials = await getClientCredentialsById(request.params.clientId)

    const { clientId, clientName, secrets } = credentials

    console.log('credentials', secrets)

    return h.view('software-providers/client/replace/index', {
      pageTitle: 'Replace the client secret',
      heading: 'Software provider',
      serviceName: 'DWT admin portal',
      clientName,
      clientId,
      secrets,
      environment: capitalise(`${environmentName()} environment`)
    })
  }
}
