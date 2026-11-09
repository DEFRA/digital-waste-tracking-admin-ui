export const paths = {
  softwareProviders: '/software-providers',
  createClientCredentials: '/software-providers/create',
  newClientCredentials: '/software-providers/credentials',
  softwareProvider: '/software-providers/{clientId}',
  deleteSoftwareProvider: '/software-providers/{clientId}/delete',
  clientCredentials: '/client-credentials',
  clientCredentialsSoftwareProviderDetail: '/software-providers/{clientId}',
  replaceClientCredentials:
    '/software-providers/{clientId}/replace'
}

/**
 * @param {String} path - A path with a {clientId} parameter
 * @param {String} clientId
 *
 * @returns {String} The path for the client
 */
export function clientPath(path, clientId) {
  return path.replace('{clientId}', encodeURIComponent(clientId))
}
