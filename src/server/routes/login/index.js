import { loginSubmitController, loginViewController } from './controller.js'
import { loginPayloadSchema } from '#/server/routes/login/schema.js'

/**
 * Sets up the routes used in the login page.
 * These routes are registered in src/server/router.js.
 */
export const login = {
  plugin: {
    name: 'login',
    register(server) {
      server.route([
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
            auth: false,
            validate: {
              payload: loginPayloadSchema,
              failAction: loginSubmitController.failAction
            }
          },
          handler: loginSubmitController.handler
        }
      ])
    }
  }
}
