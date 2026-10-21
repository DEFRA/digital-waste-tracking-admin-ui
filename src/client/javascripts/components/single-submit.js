/**
 * Lets a form (data-module="app-single-submit") be submitted only once.
 * GOV.UK's preventDoubleClick only ignores clicks within a second, but creating
 * credentials takes longer, and a second submission would replace the page
 * that shows the new secret.
 *
 * Further clicks or presses of Enter are ignored until the next page loads,
 * and the button shows as disabled. aria-disabled is used rather than
 * disabled, so the button keeps its focus.
 */
export class SingleSubmit {
  /**
   * @param {HTMLFormElement} $form - The form
   */
  constructor($form) {
    this.$form = $form
    this.submitted = false

    $form.addEventListener('submit', (event) => this.submit(event))

    // A page restored from the back/forward cache keeps its state, so start
    // again as if it had just loaded
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.reset()
      }
    })
  }

  /**
   * @param {SubmitEvent} event - The submit event
   */
  submit(event) {
    if (this.submitted) {
      event.preventDefault()
      return
    }

    this.submitted = true
    this.buttons().forEach(($button) => {
      $button.setAttribute('aria-disabled', 'true')
      $button.classList.add('govuk-button--disabled')
    })
  }

  reset() {
    this.submitted = false
    this.buttons().forEach(($button) => {
      $button.removeAttribute('aria-disabled')
      $button.classList.remove('govuk-button--disabled')
    })
  }

  /**
   * @returns {HTMLButtonElement[]} The form's buttons
   */
  buttons() {
    return [...this.$form.querySelectorAll('button')]
  }
}

/**
 * Starts every single-submit form on the page.
 */
export function initSingleSubmit() {
  document
    .querySelectorAll('[data-module="app-single-submit"]')
    .forEach(($form) => new SingleSubmit($form))
}
