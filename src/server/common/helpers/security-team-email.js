import { config } from '#/config/config.js'
import { environmentName } from '#/server/common/helpers/environment.js'

const subject = 'DWT software provider API credentials exposed'

// Outlook, the only email client staff use, takes encoded CRLFs as line
// breaks in a mailto body, and commas between cc addresses (checked in
// Outlook). The whole link should stay under about 2,000 characters
// (DWTSPI-519)
const lineBreak = '%0D%0A'

/**
 * How to report a client's credentials that may have been exposed: the
 * security team's address, and a link that opens an email to them with what
 * they need to know filled in. It never holds a secret.
 *
 * @param {{ clientId: String, clientName: String }} client
 *
 * @returns {{ address: String, href: String }} The address, and the mailto: link
 */
export function securityTeamEmail({ clientId, clientName }) {
  const { email, cc } = config.get('securityTeam')

  const body = [
    'Information to share with the Security Team:',
    `Environment: ${environmentName()}`,
    // The API the credentials are used with, as shown with new credentials
    `Environment URL: ${config.get('clientCredentials.apiUrl')}`,
    `Client name: ${clientName}`,
    `Client ID: ${clientId}`
  ]
    .map(encodeURIComponent)
    .join(lineBreak)

  return {
    address: email,
    href: `mailto:${email}?cc=${cc.join(',')}&subject=${encodeURIComponent(subject)}&body=${body}`
  }
}
