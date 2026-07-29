import { getPageName } from '#/server/common/helpers/logging/get-page-name.js'

/**
 * Adds the Basic Auth user and page name to the request logger, so page views
 * can be attributed to a user in the metrics dashboard.
 *
 * This runs on `onPostAuth` because `request.auth.credentials` is not populated
 * until authentication has run, which is after hapi-pino builds the request
 * logger on `onRequest`.
 *
 * @satisfies {import('@hapi/hapi').Plugin}
 */
export const requestContext = {
  plugin: {
    name: 'request-context',
    register(server) {
      server.ext('onPostAuth', (request, h) => {
        const page = getPageName(request)
        const username = request.auth.credentials?.username

        // Paths hapi-pino ignores are given a logger without a `child` method,
        // and are all unauthenticated and untracked, so are skipped here too
        if (page || username) {
          request.logger = request.logger.child({
            ...(page && { page: { name: page } }),
            ...(username && { user: { name: username } })
          })
        }

        return h.continue
      })
    }
  }
}
