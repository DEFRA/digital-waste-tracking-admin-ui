import { vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)

fetchMock.enableMocks()
global.fetch = fetchMock

vi.mock('ioredis')

// Most server tests exercise non-SSO behavior and do not provide OIDC config.
// Default test runtime to basic auth; individual tests can still override.
process.env.AUTH_MODE ??= 'basic'
