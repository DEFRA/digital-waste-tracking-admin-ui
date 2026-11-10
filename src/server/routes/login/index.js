import {
  entraCallbackController,
  loginSubmitController,
  loginViewController,
  logoutController
} from './controller.js'
import { config } from '#/config/config.js'

/**
 * Sets up the routes used in the login page.
 * These routes are registered in src/server/router.js.
 */
export const login = {
  plugin: {
    name: 'login',
    register(server) {
      const routes = [
        {
          method: 'GET',
          path: '/login',
          options: { auth: false },
          ...loginViewController
        },
        {
          method: 'POST',
          path: '/login',
          options: {
            auth: false
          },
          ...loginSubmitController
        }
      ]

      if (config.get('auth.mode') === 'entra') {
        routes.push(
          {
            method: ['POST'],
            path: config.get('auth.oidc.loginCallbackUri'),
            options: {
              auth: false,
              plugins: {
                crumb: false
              },
              payload: {
                parse: true,
                allow: 'application/x-www-form-urlencoded'
              }
            },
            ...entraCallbackController
          },
          {
            method: ['GET'],
            path: config.get('auth.oidc.loginCallbackUri'),
            options: {
              auth: false
            },
            ...entraCallbackController
          },
          {
            method: 'GET',
            path: '/logout',
            options: {
              auth: {
                mode: 'try',
                strategy: 'entra-session'
              }
            },
            ...logoutController
          }
        )
      }

      server.route(routes)
    }
  }
}
