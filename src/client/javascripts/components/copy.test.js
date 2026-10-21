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
    <button type="button">Copy</button>
    <span role="status" aria-live="polite"></span>
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

  test('Should say the credentials were copied', async () => {
    initCopy()

    $('button').click()

    await vi.waitFor(() =>
      expect($('[role="status"]').textContent).toEqual(
        'Client credentials copied'
      )
    )
  })

  test('Should say when the credentials could not be copied', async () => {
    writeText.mockRejectedValue(new Error('Not allowed'))
    initCopy()

    $('button').click()

    await vi.waitFor(() =>
      expect($('[role="status"]').textContent).toEqual(
        'The client credentials could not be copied. Select and copy them instead'
      )
    )
  })

  test('Should stay hidden when the browser cannot copy', () => {
    vi.stubGlobal('navigator', {})

    initCopy()

    expect($('.app-copy').hidden).toBe(true)
  })
})
