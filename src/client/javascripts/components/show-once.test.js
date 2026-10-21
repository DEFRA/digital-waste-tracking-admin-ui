// @vitest-environment jsdom
import { initShowOnce } from './show-once.js'

describe('#ShowOnce', () => {
  const $ = (selector) => document.querySelector(selector)
  let replace

  function pageEvent(type, persisted) {
    const event = new Event(type)
    event.persisted = persisted
    window.dispatchEvent(event)
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-module="app-show-once" data-leave-to="/software-providers">
        <dd data-testid="client-id" data-show-once>new-client-id</dd>
        <dd data-testid="client-secret" data-show-once>new-client-secret</dd>
        <dd data-testid="api-url">https://example.com</dd>
      </div>
    `
    replace = vi.fn()
    vi.stubGlobal('location', { replace })
    initShowOnce()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should remove the client ID and secret when the user leaves', () => {
    pageEvent('pagehide', false)

    expect($('[data-testid="client-id"]').textContent).toEqual('')
    expect($('[data-testid="client-secret"]').textContent).toEqual('')
    expect($('[data-testid="api-url"]').textContent).toEqual(
      'https://example.com'
    )
  })

  test('Should go to the Software providers page if the browser restores the page', () => {
    pageEvent('pageshow', true)

    expect(replace).toHaveBeenCalledWith('/software-providers')
  })

  test('Should stay on the page when it first loads', () => {
    pageEvent('pageshow', false)

    expect(replace).not.toHaveBeenCalled()
    expect($('[data-testid="client-secret"]').textContent).toEqual(
      'new-client-secret'
    )
  })
})
