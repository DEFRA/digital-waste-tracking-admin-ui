import { addSeconds } from 'date-fns'

/**
 * Converts OIDC token response into the application's user session shape
 * and persists it in server-side cache.
 */
export async function saveUserSession(
  request,
  sessionId,
  { accessToken, refreshToken, expiresIn, claims }
) {
  const expiresInSeconds = expiresIn
  const expiresInMilliSeconds = expiresInSeconds * 1000
  const expiresAt = addSeconds(new Date(), expiresInSeconds).toISOString()

  const username = claims.email ?? claims.preferred_username ?? claims.name

  const session = {
    id: claims.oid,
    username,
    displayName: claims.name ?? username,
    email: username,
    loginHint: claims.login_hint,
    isAuthenticated: true,
    accessToken,
    refreshToken,
    expiresIn: expiresInMilliSeconds,
    expiresAt
  }

  await request.server.sessionCache.set(sessionId, session)

  return session
}

