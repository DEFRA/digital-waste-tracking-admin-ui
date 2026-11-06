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
    expect($region.hasClass('moj-alert--success')).toBe(true)
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

  test('Should only use the variants it has styles for', () => {
    const $unknown = renderComponent('alert', {
      variant: 'information',
      title: 'Heading',
      text: 'Text'
    })

    expect($unknown('[data-testid="alert"]').attr('class')).toContain(
      'moj-alert--error'
    )
  })
})
