import { pino } from 'pino'

import { loggerOptions } from '../../../plugins/logger-options.js'

const logger = pino(loggerOptions)

/**
 * The logger for the app, set up with the options CDP's logs expect. It's one
 * logger shared by every module, so they all log the same way.
 * @returns {import('pino').Logger} The logger
 */
function createLogger() {
  return logger
}

export { createLogger }
