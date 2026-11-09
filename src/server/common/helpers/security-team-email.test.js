import { config } from '#/config/config.js'
import { securityTeamEmail } from './security-team-email.js'

describe('#securityTeamEmail', () => {
  const client = {
    clientId: '1tspaa2pb2cs1t1skbdi5fap8e',
    clientName: 'Kerbside_Collect_Test'
  }

  const originalEnvironment = config.get('cdpEnvironment')
  const originalApiUrl = config.get('clientCredentials.apiUrl')

  beforeEach(() => {
    config.set('cdpEnvironment', 'ext-test')
    config.set(
      'clientCredentials.apiUrl',
      'https://waste-movement-external-api.api.ext-test.cdp-int.defra.cloud'
    )
  })

  afterEach(() => {
    config.set('cdpEnvironment', originalEnvironment)
    config.set('clientCredentials.apiUrl', originalApiUrl)
  })

  // The link's parts, decoded
  const emailOf = (href) => {
    const url = new URL(href)
    return {
      to: url.pathname,
      cc: url.searchParams.get('cc'),
      subject: url.searchParams.get('subject'),
      body: url.searchParams.get('body')
    }
  }

  test('Should give the security team address to show', () => {
    expect(securityTeamEmail(client).address).toEqual(
      'security.team@defra.gov.uk'
    )
  })

  test('Should email the security team, copying in the people CDP names', () => {
    const { to, cc } = emailOf(securityTeamEmail(client).href)

    expect(to).toEqual('security.team@defra.gov.uk')
    expect(cc).toEqual('chris.knight@defra.gov.uk,steve.wilson@defra.gov.uk')
  })

  test('Should fill in the subject and what the security team need to know, a line each', () => {
    const { subject, body } = emailOf(securityTeamEmail(client).href)

    expect(subject).toEqual('DWT software provider API credentials exposed')
    expect(body).toEqual(
      [
        'Information to share with the Security Team:',
        'Environment: External test',
        'Environment URL: https://waste-movement-external-api.api.ext-test.cdp-int.defra.cloud',
        'Client name: Kerbside_Collect_Test',
        'Client ID: 1tspaa2pb2cs1t1skbdi5fap8e'
      ].join('\r\n')
    )
  })

  test('Should encode spaces as %20 and line breaks as CRLFs, as Outlook expects', () => {
    const { href } = securityTeamEmail(client)

    expect(href).toContain(
      '&subject=DWT%20software%20provider%20API%20credentials%20exposed&'
    )
    expect(href).toContain(
      'Security%20Team%3A%0D%0AEnvironment%3A%20External%20test%0D%0A'
    )
    expect(href).not.toContain('+')
  })

  test('Should stay under the 2,000 characters a mailto link allows, for the longest client name', () => {
    const { href } = securityTeamEmail({
      ...client,
      clientName: 'A'.repeat(128)
    })

    expect(href.length).toBeLessThan(2000)
  })
})
