import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Interruption card Component', () => {
  let $card

  beforeEach(() => {
    $card = renderComponent('interruption-card', {
      heading: 'Are you sure?',
      text: 'This cannot be undone.',
      buttonText: 'Yes, do it',
      backLink: { text: 'Go back', href: '/somewhere' }
    })
  })

  test('Should show the question as the page heading', () => {
    expect($card('h1').text().trim()).toBe('Are you sure?')
  })

  test('Should show the text', () => {
    expect($card('[data-testid="interruption-card-text"]').text().trim()).toBe(
      'This cannot be undone.'
    )
  })

  test('Should confirm with a button that submits the form, once', () => {
    const $button = $card('form[method="post"] [data-testid="confirm-button"]')

    expect($button.text().trim()).toBe('Yes, do it')
    expect($button.attr('data-prevent-double-click')).toBe('true')
    expect($card('form').attr('data-module')).toBe('app-single-submit')
  })

  test('Should link back without changing anything', () => {
    const $link = $card('[data-testid="back-link"]')

    expect($link.text().trim()).toBe('Go back')
    expect($link.attr('href')).toBe('/somewhere')
  })
})
