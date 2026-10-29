import { audit } from '@defra/cdp-auditing'

import { config } from '#/config/config.js'

/**
 * Records an attempt at a write action, whatever its outcome: a log line the
 * team can search, and an audit event, which CDP sends to Defra's Security
 * Operations Centre rather than to the logs. Never pass it a secret.
 *
 * The user (user.id and user.name) comes from the request logger, which the
 * request-context plugin binds it to. CDP's log schema has no tenant.name, so
 * the client's name goes in tenant.message, as the external API logs it.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {Object} options
 * @param {String} options.action - What was attempted, such as "created new credentials"
 * @param {'success' | 'failure' | 'unknown'} options.outcome - As ECS's
 * event.outcome. Unknown when the action may have happened
 * @param {{ clientName: String, clientId?: String }} options.client - The
 * software provider acted on. A failed create has no client id
 */
export function auditWriteAction(request, { action, outcome, client }) {
  const user = request.auth.credentials?.username
  const { clientId, clientName } = client
  const target = clientId ? `${clientName} (${clientId})` : clientName

  request.logger.info(
    {
      event: { action, outcome },
      tenant: { ...(clientId && { id: clientId }), message: clientName }
    },
    `[AdminServiceUIAudit] ${user} took action ${action} on ${target} resulting in ${outcome}`
  )

  audit({
    action,
    outcome,
    user,
    ...(clientId && { clientId }),
    clientName,
    tenantServiceName: config.get('clientCredentials.tenantServiceName')
  })
}
