// @vitest-environment jsdom
import { initCopy } from './copy.js'

const panel = `
  <dl data-copy-source>
    <dt>Generated on</dt>
    <dd>15 October 2026 at 4:49pm</dd>
    <dt>External test environment</dt>
    <dd> https://example.com </dd>
    <dt>Client ID</dt>
    <dd>new-client-id</dd>
    <dt>Client secret</dt>
    <dd>new-client-secret</dd>
  </dl>
  <div class="app-copy" data-module="app-copy" hidden>
    <button type="button">
      Copy credentials
    </button>
    <span class="govuk-visually-hidden" role="status" aria-live="polite"></span>
  </div>
`

describe('#Copy', () => {
  let writeText

  function $(selector) {
    return document.querySelector(selector)
  }

  beforeEach(() => {
    document.body.innerHTML = panel
    writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('Should show the button once it can copy', () => {
    initCopy()

    expect($('.app-copy').hidden).toBe(false)
  })

  test('Should copy each label and value, with a blank line between each pair', async () => {
    initCopy()

    $('button').click()
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled())

    expect(writeText).toHaveBeenCalledWith(
      [
        'Generated on\n15 October 2026 at 4:49pm',
        'External test environment\nhttps://example.com',
        'Client ID\nnew-client-id',
        'Client secret\nnew-client-secret'
      ].join('\n\n')
    )
  })

  test('Should say on the button that the credentials were copied, and tell screen readers', async () => {
    initCopy()

    $('button').click()

    await vi.waitFor(() =>
      expect($('button').textContent).toEqual('Credentials copied')
    )
    expect($('[role="status"]').textContent).toEqual(
      'Client credentials copied'
    )
    expect($('[role="status"]').classList).toContain('govuk-visually-hidden')
    expect(document.activeElement).not.toBe($('[role="status"]'))
  })

  test('Should go back to the button label after four seconds', async () => {
    vi.useFakeTimers()
    initCopy()

    $('button').click()
    await vi.advanceTimersByTimeAsync(0)
    expect($('button').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(3999)
    expect($('button').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(1)
    expect($('button').textContent).toEqual('Copy credentials')
    // So copying again is read out again
    expect($('[role="status"]').textContent).toEqual('')
  })

  test('Should start the four seconds again when copied again', async () => {
    vi.useFakeTimers()
    initCopy()

    $('button').click()
    await vi.advanceTimersByTimeAsync(3000)
    $('button').click()
    await vi.advanceTimersByTimeAsync(3000)
    expect($('button').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(1000)
    expect($('button').textContent).toEqual('Copy credentials')
  })

  test('Should show, not just read out, that the credentials could not be copied', async () => {
    writeText.mockRejectedValue(new Error('Not allowed'))
    initCopy()

    $('button').click()

    await vi.waitFor(() =>
      expect($('[role="status"]').textContent).toEqual(
        'The client credentials could not be copied. Select and copy them instead'
      )
    )
    expect($('[role="status"]').classList).not.toContain(
      'govuk-visually-hidden'
    )
    expect($('button').textContent.trim()).toEqual('Copy credentials')
  })

  test('Should stay hidden when the browser cannot copy', () => {
    vi.stubGlobal('navigator', {})

    initCopy()

    expect($('.app-copy').hidden).toBe(true)
  })
})
