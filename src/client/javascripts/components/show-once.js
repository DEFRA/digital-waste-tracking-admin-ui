/**
 * Keeps a page that shows a secret (data-module="app-show-once") from being
 * shown again by the browser's back/forward cache, which can restore a page
 * without asking the server, even with Cache-Control: no-store.
 *
 * When the user leaves, the values marked data-show-once are removed, so the
 * copy the browser keeps doesn't hold them. If the page is restored anyway, it
 * goes to the data-leave-to address, as going back to it should.
 *
 * Without JavaScript this can't run, so going back can still show the secret
 * again from the browser's memory, although the server only sends it once.
 */
export class ShowOnce {
  /**
   * @param {HTMLElement} $module - The element with data-module="app-show-once"
   */
  constructor($module) {
    this.$module = $module

    window.addEventListener('pagehide', () => this.forget())
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.leave()
      }
    })
  }

  forget() {
    this.$module.querySelectorAll('[data-show-once]').forEach(($value) => {
      $value.textContent = ''
    })
  }

  leave() {
    window.location.replace(this.$module.dataset.leaveTo)
  }
}

/**
 * Starts every show-once page section.
 */
export function initShowOnce() {
  document
    .querySelectorAll('[data-module="app-show-once"]')
    .forEach(($module) => new ShowOnce($module))
}
