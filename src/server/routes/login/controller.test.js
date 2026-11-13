import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  entraCallbackController,
  loginViewController,
  loginSubmitController
} from './controller.js'
import { config } from '#/config/config.js'

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User login',
  heading: 'User login',
  serviceName: 'DWT admin portal',
  breadcrumbs: [{ text: 'Login', href: '/login' }]
}

const USERNAME_PASSWORD_ERROR_MESSAGE = 'Enter a correct username and password'

/**
 * Builds a fake Hapi toolkit (`h`) with chainable `.view()` / `.response()`
 * methods, matching how the controller uses them.
 */
const createToolkit = () => {
  const viewResult = { code: vi.fn(), takeover: vi.fn() }
  viewResult.code.mockReturnValue(viewResult)
  viewResult.takeover.mockReturnValue(viewResult)

  const responseResult = {
    state: vi.fn(),
    redirect: vi.fn(),
    takeover: vi.fn(),
    code: vi.fn()
  }
  responseResult.state.mockReturnValue(responseResult)
  responseResult.redirect.mockReturnValue(responseResult)
  responseResult.takeover.mockReturnValue(responseResult)
  responseResult.code.mockReturnValue(responseResult)

  return {
    view: vi.fn().mockReturnValue(viewResult),
    response: vi.fn().mockReturnValue(responseResult),
    redirect: vi.fn(),
    unstate: vi.fn(),
    viewResult,
    responseResult
  }
}

describe('loginViewController', () => {
  beforeEach(() => {
    config.set('auth.mode', 'basic')
  })

  it('renders the login view with the login context', () => {
    const h = createToolkit()
    const request = { query: {} }

    loginViewController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: '/'
    })
  })

  it('carries through a redirectTo query param', () => {
    const h = createToolkit()
    const request = { query: { redirectTo: '/movements/123' } }

    loginViewController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: '/movements/123'
    })
  })

  it('starts OIDC login when auth mode is entra', async () => {
    config.set('auth.mode', 'entra')

    const h = createToolkit()
    const request = {
      query: { redirectTo: '/movements/123' },
      info: { referrer: 'http://localhost:3000/movements/123' },
      yar: { flash: vi.fn() },
      login: vi.fn()
    }

    request.login.mockResolvedValue('redirect-response')

    await loginViewController.handler(request, h)

    expect(request.yar.flash).toHaveBeenCalledWith('authReferrer', '/movements/123')
    expect(request.login).toHaveBeenCalledWith(h)
  })
})

describe('loginSubmitController.handler', () => {
  let request
  let h

  beforeEach(() => {
    config.set('auth.mode', 'basic')

    h = createToolkit()
    request = {
      payload: {
        username: 'alice',
        password: 'secret',
        redirectTo: '/movements/123'
      },
      headers: {},
      server: {
        auth: {
          test: vi.fn()
        }
      },
      yar: {
        flash: vi.fn()
      },
      login: vi.fn()
    }
  })

  it('sets a Basic authorization header from the submitted credentials', async () => {
    request.server.auth.test.mockResolvedValue({})

    await loginSubmitController.handler(request, h)

    const expected = `Basic ${Buffer.from('alice:secret').toString('base64')}`
    expect(request.headers.authorization).toBe(expected)
  })

  it('validates the credentials against the basic auth strategy', async () => {
    request.server.auth.test.mockResolvedValue({})

    await loginSubmitController.handler(request, h)

    expect(request.server.auth.test).toHaveBeenCalledWith('basic', request)
  })

  it('on success, stashes the credentials in a cookie and redirects to redirectTo', async () => {
    request.server.auth.test.mockResolvedValue({})

    await loginSubmitController.handler(request, h)

    const expectedAuthorization = `Basic ${Buffer.from('alice:secret').toString('base64')}`
    expect(h.response).toHaveBeenCalled()
    expect(h.responseResult.state).toHaveBeenCalledWith('dwtAuth', {
      authorization: expectedAuthorization
    })
    expect(h.responseResult.redirect).toHaveBeenCalledWith('/movements/123')
  })

  it('on success with no redirectTo, redirects to /', async () => {
    request.payload.redirectTo = undefined
    request.server.auth.test.mockResolvedValue({})

    await loginSubmitController.handler(request, h)

    expect(h.responseResult.redirect).toHaveBeenCalledWith('/')
  })

  it('on failed auth, renders the login view with a generic credentials error', async () => {
    request.server.auth.test.mockRejectedValue(new Error('Invalid credentials'))

    await loginSubmitController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('login/index', {
      ...LOGIN_VIEW_CONTEXT,
      redirectTo: '/movements/123',
      errors: {
        login: USERNAME_PASSWORD_ERROR_MESSAGE
      }
    })
    expect(h.viewResult.code).toHaveBeenCalledWith(401)
  })

  it('on failed auth with no redirectTo, defaults redirectTo to /', async () => {
    request.payload.redirectTo = undefined
    request.server.auth.test.mockRejectedValue(new Error('Invalid credentials'))

    await loginSubmitController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'login/index',
      expect.objectContaining({ redirectTo: '/' })
    )
  })

  it('does not distinguish between a bad username and a bad password in the error message', async () => {
    request.server.auth.test.mockRejectedValue(new Error('Invalid credentials'))

    await loginSubmitController.handler(request, h)

    const [, context] = h.view.mock.calls[0]
    expect(context.errors.username).toBe(context.errors.password)
  })

  it('redirects to Entra when auth mode is entra', async () => {
    config.set('auth.mode', 'entra')

    request.login.mockResolvedValue('redirect-response')

    await loginSubmitController.handler(request, h)

    expect(request.yar.flash).toHaveBeenCalledWith('authReferrer', '/movements/123')
    expect(request.login).toHaveBeenCalledWith(h)
    expect(request.server.auth.test).not.toHaveBeenCalled()
  })
})

describe('entraCallbackController.handler', () => {
  it('stores user session and returns callback takeover response', async () => {
    const h = createToolkit()
    const request = {
      callback: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        claims: {
          oid: 'oid-123',
          name: 'Test User',
          email: 'test.user@defra.gov.uk'
        }
      }),
      sessionCookie: {
        set: vi.fn()
      },
      server: {
        sessionCache: {
          set: vi.fn()
        }
      },
      yar: {
        flash: vi.fn().mockReturnValue(['/reporting'])
      }
    }

    await entraCallbackController.handler(request, h)

    expect(request.callback).toHaveBeenCalledWith(h)
    expect(request.server.sessionCache.set).toHaveBeenCalledOnce()
    expect(request.sessionCookie.set).toHaveBeenCalledOnce()
    expect(h.responseResult.takeover).toHaveBeenCalled()
  })

  it('returns a 401 response if callback has no credentials', async () => {
    const h = createToolkit()
    const request = {
      callback: vi.fn().mockResolvedValue(undefined)
    }

    await entraCallbackController.handler(request, h)

    expect(h.response).toHaveBeenCalledWith(
      'We could not sign you in with Microsoft Entra ID. Please contact support.'
    )
    expect(h.responseResult.code).toHaveBeenCalledWith(401)
    expect(h.responseResult.takeover).toHaveBeenCalled()
  })

  it('returns a 401 response if callback throws', async () => {
    const h = createToolkit()
    const request = {
      callback: vi.fn().mockRejectedValue(new Error('oidc failure')),
      logger: { error: vi.fn() }
    }

    await entraCallbackController.handler(request, h)

    expect(request.logger.error).toHaveBeenCalled()
    expect(h.responseResult.code).toHaveBeenCalledWith(401)
    expect(h.responseResult.takeover).toHaveBeenCalled()
  })
})
