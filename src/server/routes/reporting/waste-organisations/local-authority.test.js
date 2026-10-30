import { localAuthorityText } from './local-authority.js'

describe('#localAuthorityText', () => {
  test.each([
    [true, 'Yes'],
    [false, 'No'],
    [undefined, ''],
    [null, '']
  ])('Should show %s as "%s"', (isLocalAuthority, text) => {
    expect(localAuthorityText(isLocalAuthority)).toEqual(text)
  })
})
