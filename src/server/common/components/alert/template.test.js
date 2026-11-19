import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Alert Component', () => {
  let $alert

  beforeEach(() => {
    $alert = renderComponent('alert', {
      variant: 'success',
      title: 'Software provider deleted',
      text: 'Kerbside_Collect_Test has been deleted.'
    })
  })

  test('Should be a named region, so a screen reader reads it in order', () => {
    const $region = $alert('[data-testid="alert"]')

    expect($region.attr('role')).toBe('region')
    expect($region.attr('aria-label')).toBe(
      'success: Software provider deleted'
    )
  })

  test('Should have an H2 heading and the text', () => {
    expect($alert('h2').text().trim()).toBe('Software provider deleted')
    expect($alert('[data-testid="alert-text"]').text().trim()).toBe(
      'Kerbside_Collect_Test has been deleted.'
    )
  })

  test('Should have a decorative icon', () => {
    const $icon = $alert('svg')

    expect($icon.attr('role')).toBe('presentation')
    expect($icon.attr('focusable')).toBe('false')
  })

  test('Should not take focus or be dismissed', () => {
    expect($alert('[data-module]')).toHaveLength(0)
    expect($alert('button')).toHaveLength(0)
  })

  describe('With focus, for a problem the user needs to know about at once', () => {
    let $focused

    beforeEach(() => {
      $focused = renderComponent('alert', {
        variant: 'error',
        title: 'Sorry, there is a problem with the service',
        text: 'Try again. We have not added a secret.',
        focus: true
      })
    })

    test('Should be an alert, so a screen reader reads it when the page loads', () => {
      const $root = $focused('[data-testid="alert"]')

      expect($root.attr('role')).toBe('alert')
      expect($root.attr('aria-label')).toBe(
        'error: Sorry, there is a problem with the service'
      )
    })

    test("Should use MoJ Frontend's script, which focuses it, and not be dismissed", () => {
      const $root = $focused('[data-testid="alert"]')

      expect($root.attr('data-module')).toBe('moj-alert')
      expect($root.attr('data-disable-auto-focus')).toBeUndefined()
      expect($focused('button')).toHaveLength(0)
    })
  })

  test('Should only use the variants it has styles for', () => {
    const $unknown = renderComponent('alert', {
      variant: 'information',
      title: 'Heading',
      text: 'Text'
    })

    expect($unknown('[data-testid="alert"]').attr('aria-label')).toBe(
      'error: Heading'
    )
  })
})
