import { JSDOM } from 'jsdom'
import { getElementText } from './get-element-text.js'

describe('#getElementText', () => {
  const document = JSDOM.fragment(`
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
    <div data-testid="app-page-body">
      <p class="govuk-body">
        Search waste organisations by DefraID registration date.
      </p>
    </div>
    </div>
  </div>
  `)

  test('Should get the element text when given an existant element', () => {
    const result = getElementText(document, 'app-page-body')

    expect(result).toEqual(
      'Search waste organisations by DefraID registration date.'
    )
  })

  test('Should return undefined when given a non-existent element', () => {
    const result = getElementText(document, 'app-body')

    expect(result).toBeUndefined()
  })
})
