// @vitest-environment jsdom
import { initSingleSubmit } from './single-submit.js'

describe('#SingleSubmit', () => {
  const $ = (selector) => document.querySelector(selector)

  function submit() {
    const event = new Event('submit', { cancelable: true })
    $('form').dispatchEvent(event)
    return event
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <form data-module="app-single-submit">
        <button class="govuk-button">Generate credentials</button>
      </form>
    `
    initSingleSubmit()
  })

  test('Should let the form be submitted once', () => {
    expect(submit().defaultPrevented).toBe(false)
  })

  test('Should ignore any later submissions, however late', () => {
    submit()

    expect(submit().defaultPrevented).toBe(true)
    expect(submit().defaultPrevented).toBe(true)
  })

  test('Should show the button as disabled, keeping it focusable', () => {
    submit()

    expect($('button').getAttribute('aria-disabled')).toEqual('true')
    expect($('button').classList).toContain('govuk-button--disabled')
    expect($('button').disabled).toBe(false)
  })

  test('Should start again when the page is restored from the back/forward cache', () => {
    submit()

    const pageshow = new Event('pageshow')
    pageshow.persisted = true
    window.dispatchEvent(pageshow)

    expect($('button').hasAttribute('aria-disabled')).toBe(false)
    expect(submit().defaultPrevented).toBe(false)
  })
})
