/**
 * The Copy button on the credentials page (data-module="app-copy"). Copies the
 * credentials panel as plain text: each label on its own line, followed by its
 * value, with a blank line between each pair.
 *
 * The button is hidden until this runs, so without JavaScript the credentials
 * can still be selected and copied by hand.
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
   * @returns {String} The credentials as plain text
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
      this.$status.textContent = 'Client credentials copied'
    } catch {
      this.$status.textContent =
        'The client credentials could not be copied. Select and copy them instead'
    }
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
