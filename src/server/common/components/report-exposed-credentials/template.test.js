import { securityTeamEmail } from '#/server/common/helpers/security-team-email.js'
import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Report exposed credentials Component', () => {
  let $paragraph

  beforeEach(() => {
    $paragraph = renderComponent('report-exposed-credentials', {
      address: 'security.team@defra.gov.uk',
      href: 'mailto:security.team@defra.gov.uk?subject=Exposed'
    })
  })

  test('Should say who to email, with the address as the link text', () => {
    expect(
      $paragraph('[data-testid="report-exposed-credentials"]').text().trim()
    ).toBe(
      'If credentials have been exposed, email security.team@defra.gov.uk.'
    )
  })

  test('Should link to the prefilled email, in the inverse style for the card', () => {
    const $link = $paragraph('[data-testid="security-team-email"]')

    expect($link.attr('href')).toBe(
      'mailto:security.team@defra.gov.uk?subject=Exposed'
    )
    expect($link.hasClass('govuk-link')).toBe(true)
    expect($link.hasClass('govuk-link--inverse')).toBe(true)
  })

  test('Should keep the whole prefilled email link when rendered', () => {
    const email = securityTeamEmail({
      clientId: '1tspaa2pb2cs1t1skbdi5fap8e',
      clientName: 'Kerbside_Collect_Test'
    })

    const $rendered = renderComponent('report-exposed-credentials', email)

    expect(
      $rendered('[data-testid="security-team-email"]').attr('href')
    ).toEqual(email.href)
  })
})
