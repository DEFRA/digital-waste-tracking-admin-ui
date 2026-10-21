import { config } from '#/config/config.js'

// The label for each CDP environment
const environmentLabels = {
  dev: 'Dev',
  test: 'Test',
  'perf-test': 'Performance test',
  'ext-test': 'External test',
  prod: 'Production'
}

/**
 * Names the environment the portal is running in, such as "External test".
 * Environments without a label, such as local, show their own name.
 *
 * @returns {String} The environment name
 */
export function environmentName() {
  const environment = config.get('cdpEnvironment')

  return environmentLabels[environment] ?? environment
}
