/**
 * @param {Boolean} [isLocalAuthority]
 *
 * @returns {String} Yes or No, or Not known, as the flag is only stored for an
 * organisation that said it's a local authority
 */
export function localAuthorityText(isLocalAuthority) {
  if (isLocalAuthority === true) {
    return 'Yes'
  }

  return isLocalAuthority === false ? 'No' : 'Not known'
}
