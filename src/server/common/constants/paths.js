export const paths = {
  // The page anyone not signed in is sent to
  signIn: '/sign-in',
  // Starts signing in with Entra ID
  startSignIn: '/login',
  // Where Entra ID sends the user back to after they sign in. It must match a
  // redirect URI on the app registration exactly
  signInCallback: '/auth',
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
