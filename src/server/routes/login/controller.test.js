import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginViewController, loginSubmitController } from './controller.js'

const LOGIN_VIEW_CONTEXT = {
  pageTitle: 'User Login',
  heading: 'User Login',
  serviceName: 'DWT Admin Portal',
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
    redirect: vi.fn()
  }
  responseResult.state.mockReturnValue(responseResult)
  responseResult.redirect.mockReturnValue(responseResult)

  return {
    view: vi.fn().mockReturnValue(viewResult),
    response: vi.fn().mockReturnValue(responseResult),
    viewResult,
    responseResult
  }
}

describe('loginViewController', () => {
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
})

describe('loginSubmitController.handler', () => {
  let request
  let h

  beforeEach(() => {
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
      }
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
        username: USERNAME_PASSWORD_ERROR_MESSAGE,
        password: USERNAME_PASSWORD_ERROR_MESSAGE
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
})
