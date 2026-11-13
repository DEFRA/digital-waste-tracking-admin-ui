export const paths = {
  softwareProviders: '/software-providers',
  createClientCredentials: '/software-providers/create',
  newClientCredentials: '/software-providers/credentials',
  softwareProvider: '/software-providers/{clientId}',
  deleteSoftwareProvider: '/software-providers/{clientId}/delete',
  replaceClientCredentials: '/software-providers/{clientId}/replace',
  removeClientCredentials: '/software-providers/{clientId}/remove',
  addClientCredentials: '/software-providers/{clientId}/add-secret'
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
