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

  test('Should escape the text', () => {
    const $escaped = renderComponent('interruption-card', {
      heading: 'Are you sure?',
      text: '<script>alert(1)</script>',
      buttonText: 'Yes, do it',
      backLink: { text: 'Go back', href: '/somewhere' }
    })

    expect(
      $escaped('[data-testid="interruption-card-text"] script')
    ).toHaveLength(0)
    expect($escaped('[data-testid="interruption-card-text"]').html()).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  test('Should show a block of html, such as links in paragraphs, inside the body', () => {
    const $block = renderComponent(
      'interruption-card',
      {
        heading: 'Are you sure?',
        buttonText: 'Yes, do it',
        backLink: { text: 'Go back', href: '/somewhere' }
      },
      '<p class="govuk-body">This cannot be undone.</p><p class="govuk-body">Email <a class="govuk-link" href="mailto:security.team@defra.gov.uk">security.team@defra.gov.uk</a></p>'
    )
    const $body = $block('[data-testid="interruption-card-text"]')
    const $link = $body.find('a')

    expect($body.find('p')).toHaveLength(2)
    expect($body.is('div')).toBe(true)
    expect($link.text()).toBe('security.team@defra.gov.uk')
    expect($link.attr('href')).toBe('mailto:security.team@defra.gov.uk')
    expect($link.attr('class')).toBe('govuk-link')
  })

  test('Should keep plain text in its own paragraph', () => {
    expect($card('[data-testid="interruption-card-text"]').is('p')).toBe(true)
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
