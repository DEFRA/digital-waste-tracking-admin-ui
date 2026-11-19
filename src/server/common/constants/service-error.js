// The alert shown when Client Sync says a change didn't happen, as when CDP
// refused it or was unavailable, so the user can just try again
export const serviceErrorTitle = 'Sorry, there is a problem with the service'

export const serviceErrorText = {
  create: 'Try again. We have not created client credentials.',
  replace: 'Try again. We have not replaced the secret.',
  add: 'Try again. We have not added a secret.',
  remove: 'Try again. We have not removed the secret.',
  delete: 'Try again. We have not deleted the software provider.'
}

/**
 * @param {keyof typeof serviceErrorText} action - What didn't happen
 *
 * @returns {{ title: String, text: String }} The alert's title and text
 */
export function serviceErrorAlert(action) {
  return { title: serviceErrorTitle, text: serviceErrorText[action] }
}
