import { getPageName } from '#/server/common/helpers/logging/get-page-name.js'
import { metricNames } from '#/server/common/constants/metric-names.js'

/**
 * Records a page view against the Basic Auth user, so usage can be broken down
 * per user in the metrics dashboard, and adds the same context to the request
 * logger.
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
      server.ext('onPostAuth', async (request, h) => {
        const page = getPageName(request)
        const user = request.auth.credentials?.username

        // Paths hapi-pino ignores are given a logger without a `child` method,
        // and are all unauthenticated and untracked, so are skipped here too
        if (page || user) {
          request.logger = request.logger.child({
            ...(page && { page: { name: page } }),
            ...(user && { user: { name: user } })
          })
        }

        if (page && user) {
          await request.metrics.counter(metricNames.pageViews, 1, {
            page,
            user
          })
        }

        return h.continue
      })
    }
  }
}
