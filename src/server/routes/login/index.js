import {
  signInCallbackController,
  signInController,
  signInPageController
} from './controller.js'
import { paths } from '#/server/common/constants/paths.js'
import { entraStrategy } from '#/server/plugins/entra-id.js'

/**
 * Sets up the routes used to sign in with Entra ID.
 * These routes are registered in src/server/router.js.
 */
export const login = {
  plugin: {
    name: 'login',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.signIn,
          // Knows if they're already signed in, without asking them to
          options: { auth: { mode: 'try', strategy: entraStrategy } },
          ...signInPageController
        },
        {
          method: 'GET',
          path: paths.startSignIn,
          options: { auth: false },
          ...signInController
        },
        {
          method: 'GET',
          path: paths.signInCallback,
          options: { auth: false },
          ...signInCallbackController
        }
      ])
    }
  }
}
