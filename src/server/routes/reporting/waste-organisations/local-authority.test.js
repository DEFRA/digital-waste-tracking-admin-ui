import { localAuthorityText } from './local-authority.js'

describe('#localAuthorityText', () => {
  test.each([
    [true, 'Yes'],
    [false, 'No'],
    [undefined, 'Not known'],
    [null, 'Not known']
  ])('Should show %s as "%s"', (isLocalAuthority, text) => {
    expect(localAuthorityText(isLocalAuthority)).toEqual(text)
  })
})
