import Boom from '@hapi/boom'

import { signedInUserKey } from '#/server/plugins/entra-id.js'
import { safeRedirectPath } from '#/server/common/helpers/safe-redirect-path.js'

// Where the user was going, kept in the session while they sign in
const redirectToKey = 'signInRedirectTo'

/**
 * Sends the user to Entra ID to sign in, remembering where they were going.
 */
export const signInController = {
  async handler(request, h) {
    request.yar.set(redirectToKey, safeRedirectPath(request.query.redirectTo))

    try {
      return await request.login(h)
    } catch (err) {
      // Such as Entra ID being unreachable. Not a 401, which would send them
      // back here to sign in, and round again
      request.logger.error({ err }, 'Could not start signing in with Entra ID')
      throw Boom.badGateway()
    }
  }
}

/**
 * Entra ID sends the user back here once they've signed in. Exchanges its code
 * for who they are, keeps that in a new session and sends them on to where
 * they were going.
 */
export const signInCallbackController = {
  async handler(request, h) {
    let claims

    try {
      ;({ claims } = await request.callback(h))
    } catch (err) {
      // Not a 401, which would send them back to sign in, and round again
      request.logger.warn({ err }, 'Signing in with Entra ID failed')
      throw Boom.forbidden()
    }

    const redirectTo = safeRedirectPath(request.yar.get(redirectToKey))

    // A new session, so one from before they signed in can't be reused
    request.yar.reset()
    request.yar.set(signedInUserKey, {
      id: claims.oid,
      // Logged as the user in audit lines and metrics
      username: claims.preferred_username ?? claims.email,
      name: claims.name
    })

    return h.redirect(redirectTo)
  }
}
