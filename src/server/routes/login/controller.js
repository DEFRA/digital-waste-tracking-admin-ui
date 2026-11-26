import { paths } from '#/server/common/constants/paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signedInUserKey } from '#/server/plugins/entra-id.js'
import { safeRedirectPath } from '#/server/common/helpers/safe-redirect-path.js'

// Where the user was going, kept in the session while they sign in
const redirectToKey = 'signInRedirectTo'

/**
 * The path that starts signing in, then goes on to where the user was going.
 * @param {string} redirectTo - Where the user was going
 * @returns {string} The path that starts signing in, then goes there
 */
function startSignInPath(redirectTo) {
  return redirectTo === '/'
    ? paths.startSignIn
    : `${paths.startSignIn}?redirectTo=${encodeURIComponent(redirectTo)}`
}

/**
 * What the portal is for, with a button to sign in. Where anyone who isn't
 * signed in is sent.
 */
export const signInPageController = {
  handler(request, h) {
    // Already signed in, so straight on to where they were going
    if (request.auth.isAuthenticated) {
      return h.redirect(safeRedirectPath(request.query.redirectTo))
    }

    return h.view('login/sign-in', {
      pageTitle: 'Sign in',
      signedOut: true,
      startSignInPath: startSignInPath(
        safeRedirectPath(request.query.redirectTo)
      )
    })
  }
}

/**
 * The error page, for when signing in fails. Trying again goes straight to
 * Entra ID, and still on to where they were going.
 * @param {import('@hapi/hapi').Request} request - The request
 * @param {import('@hapi/hapi').ResponseToolkit} h - The response toolkit
 * @param {number} statusCode - The status to answer with
 * @returns {import('@hapi/hapi').ResponseObject} The error page
 */
function signInFailed(request, h, statusCode) {
  // Not signed in, even if they were before trying again
  request.yar.clear(signedInUserKey)

  return h
    .view('login/error', {
      pageTitle: 'There was a problem signing you in',
      signedOut: true,
      startSignInPath: startSignInPath(
        safeRedirectPath(request.yar.get(redirectToKey))
      )
    })
    .code(statusCode)
}

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
      // back to sign in, and round again
      request.logger.error({ err }, 'Could not start signing in with Entra ID')
      return signInFailed(request, h, statusCodes.badGateway)
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
      // Such as cancelling at Entra ID. Not a 401, which would send them back
      // to sign in, and round again
      request.logger.warn({ err }, 'Signing in with Entra ID failed')
      return signInFailed(request, h, statusCodes.forbidden)
    }

    const redirectTo = safeRedirectPath(request.yar.get(redirectToKey))

    // A new session, so one from before they signed in can't be reused
    request.yar.reset()
    request.yar.set(signedInUserKey, {
      id: claims.oid,
      // Logged as the user in audit lines and metrics
      username: claims.preferred_username ?? claims.email ?? claims.oid,
      name: claims.name
    })

    return h.redirect(redirectTo)
  }
}
