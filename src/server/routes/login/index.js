import { signInCallbackController, signInController } from './controller.js'
import { paths } from '#/server/common/constants/paths.js'

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
