import { config } from '#/config/config.js'

// The label for each CDP environment
const environmentLabels = {
  local: 'Local',
  dev: 'Dev',
  test: 'Test',
  'perf-test': 'Performance test',
  'ext-test': 'External test',
  prod: 'Production'
}

/**
 * Names the environment the portal is running in, such as "External test".
 * An environment without a label shows its own name.
 *
 * @returns {String} The environment name
 */
export function environmentName() {
  const environment = config.get('cdpEnvironment')

  return environmentLabels[environment] ?? environment
}
