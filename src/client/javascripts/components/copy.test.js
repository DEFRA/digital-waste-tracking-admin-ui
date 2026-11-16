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
      <span data-copy-label>Copy credentials</span><span class="govuk-visually-hidden"> client ID and client secret</span>
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

    $('button').focus()
    $('button').click()

    await vi.waitFor(() =>
      expect($('[data-copy-label]').textContent).toEqual('Credentials copied')
    )
    expect($('[role="status"]').textContent).toEqual(
      'Client credentials copied'
    )
    expect($('[role="status"]').classList).toContain('govuk-visually-hidden')
    expect(document.activeElement).toBe($('button'))
  })

  test("Should keep the visible label at the start of the button's name", async () => {
    // The name is the button's text, including the visually hidden part
    const name = () => $('button').textContent.replace(/\s+/g, ' ').trim()
    initCopy()
    expect(name()).toEqual('Copy credentials client ID and client secret')

    $('button').click()

    await vi.waitFor(() =>
      expect(name()).toEqual('Credentials copied client ID and client secret')
    )
  })

  test('Should go back to the button label after four seconds', async () => {
    vi.useFakeTimers()
    initCopy()

    $('button').click()
    await vi.advanceTimersByTimeAsync(0)
    expect($('[data-copy-label]').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(3999)
    expect($('[data-copy-label]').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(1)
    expect($('[data-copy-label]').textContent).toEqual('Copy credentials')
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
    expect($('[data-copy-label]').textContent).toEqual('Credentials copied')

    await vi.advanceTimersByTimeAsync(1000)
    expect($('[data-copy-label]').textContent).toEqual('Copy credentials')
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
    expect($('[data-copy-label]').textContent).toEqual('Copy credentials')
  })

  test('Should not still say copied when copying again fails', async () => {
    vi.useFakeTimers()
    initCopy()

    $('button').click()
    await vi.advanceTimersByTimeAsync(1000)
    writeText.mockRejectedValue(new Error('Not allowed'))
    $('button').click()
    await vi.advanceTimersByTimeAsync(0)

    expect($('[data-copy-label]').textContent).toEqual('Copy credentials')
    // The earlier copy's few seconds don't clear the error
    await vi.advanceTimersByTimeAsync(4000)
    expect($('[role="status"]').textContent).toEqual(
      'The client credentials could not be copied. Select and copy them instead'
    )
  })

  test('Should stay hidden when the browser cannot copy', () => {
    vi.stubGlobal('navigator', {})

    initCopy()

    expect($('.app-copy').hidden).toBe(true)
  })
})
