import yar from '@hapi/yar'

import { config } from '#/config/config.js'

const sessionConfig = config.get('session')

/**
 * Always kept server-side, with only the session's id in the cookie, as it
 * holds who's signed in. A session kept in the cookie couldn't be ended by the
 * server, and a copy of the cookie would keep working
 */
export const sessionCache = {
  plugin: yar,
  options: {
    maxCookieSize: 0,
    name: sessionConfig.cache.name,
    cache: {
      cache: sessionConfig.cache.name,
      expiresIn: sessionConfig.cache.ttl
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: sessionConfig.cookie.password,
      ttl: sessionConfig.cookie.ttl,
      isSecure: config.get('session.cookie.secure'),
      clearInvalid: true
    }
  }
}
