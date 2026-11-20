// Messages shown once, on the next page, after an action redirects there
export const flashKeys = {
  deletedSoftwareProvider: 'deletedSoftwareProvider',
  // The client whose new secret was just shown, so it can be tagged "New"
  newSecretClientId: 'newSecretClientId',
  removedClientSecret: 'removedClientSecret',
  // The backend didn't report whether the change occured
  uncertainClientChange: 'uncertainClientChange',
  // The change was refused because the client is out of date or shares a name
  conflictedClientChange: 'conflictedClientChange',
  // The change didn't happen, as when CDP refused it, so it can be tried again
  failedClientChange: 'failedClientChange'
}
