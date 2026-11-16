// Messages shown once, on the next page, after an action redirects there
export const flashKeys = {
  deletedSoftwareProvider: 'deletedSoftwareProvider',
  createdClientSecret: 'createdClientSecret',
  removedClientSecret: 'removedClientSecret',
  // The backend didn't report whether the change occured
  uncertainClientChange: 'uncertainClientChange',
  // The change was refused because the client is out of date or shares a name
  conflictedClientChange: 'conflictedClientChange'
}
