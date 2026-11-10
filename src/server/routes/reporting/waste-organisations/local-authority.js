/**
 * @param {Boolean} [isLocalAuthority] - Optional: missing when it isn't known,
 * as the flag is only stored when an organisation says it's a local authority
 *
 * @returns {String} Yes, No or Not known
 */
export function localAuthorityText(isLocalAuthority) {
  if (isLocalAuthority === true) {
    return 'Yes'
  }

  return isLocalAuthority === false ? 'No' : 'Not known'
}
