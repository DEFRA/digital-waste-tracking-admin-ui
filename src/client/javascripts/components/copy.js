// How long the button says the credentials were copied
const copiedForMs = 4000

/**
 * The Copy button on the credentials page (data-module="app-copy"). Copies the
 * credentials panel as plain text: each label on its own line, followed by its
 * value, with a blank line between each pair.
 *
 * The button is hidden until this runs, so without JavaScript the credentials
 * can still be selected and copied by hand.
 *
 * Once copied, the button says so for a few seconds, and a visually hidden
 * status tells screen readers. Focus stays on the button.
 */
export class Copy {
  /**
   * @param {HTMLElement} $module - The element with data-module="app-copy"
   */
  constructor($module) {
    this.$module = $module
    this.$button = $module.querySelector('button')
    this.$status = $module.querySelector('[role="status"]')
    this.$source = document.querySelector('[data-copy-source]')
    // The visible label, without the visually hidden rest of the button's name
    this.$label =
      this.$button?.querySelector('[data-copy-label]') ?? this.$button
    this.label = this.$label?.textContent.trim()

    if (
      !this.$button ||
      !this.$status ||
      !this.$source ||
      !navigator.clipboard
    ) {
      return
    }

    this.$button.addEventListener('click', () => this.copy())
    this.$module.hidden = false
  }

  /**
   * @returns {string} The credentials as plain text
   */
  text() {
    const labels = [...this.$source.querySelectorAll('dt')]

    return labels
      .map(
        ($label) =>
          `${$label.textContent.trim()}\n${$label.nextElementSibling.textContent.trim()}`
      )
      .join('\n\n')
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.text())
    } catch {
      // Not "Credentials copied" from an earlier copy, beside the error
      clearTimeout(this.timeout)
      this.$label.textContent = this.label

      // Shown as well as read out, as it asks the user to do something
      this.$status.classList.remove('govuk-visually-hidden')
      this.$status.textContent =
        'The client credentials could not be copied. Select and copy them instead'
      return
    }

    this.$status.classList.add('govuk-visually-hidden')
    this.$status.textContent = 'Client credentials copied'
    this.$label.textContent = 'Credentials copied'

    // Copying again starts the few seconds again
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.$label.textContent = this.label
      // Cleared, so copying again is read out again
      this.$status.textContent = ''
    }, copiedForMs)
  }
}

/**
 * Starts every Copy button on the page.
 */
export function initCopy() {
  document
    .querySelectorAll('[data-module="app-copy"]')
    .forEach(($module) => new Copy($module))
}
