/**
 * Checks the page shows the "problem with the service" alert, first in the
 * main content, announced and focused when the page loads (DWTSPI-493)
 *
 * @param {Document} document - The page
 * @param {String} text - What it says wasn't done
 */
export function expectServiceErrorAlert(document, text) {
  const alert = document.querySelector('[data-testid="service-error-alert"]')

  expect(alert.getAttribute('role')).toEqual('alert')
  expect(alert.getAttribute('data-module')).toEqual('moj-alert')
  expect(alert.getAttribute('aria-label')).toEqual(
    'error: Sorry, there is a problem with the service'
  )
  expect(alert.querySelector('h2').textContent.trim()).toEqual(
    'Sorry, there is a problem with the service'
  )
  expect(
    alert.querySelector('[data-testid="alert-text"]').textContent.trim()
  ).toEqual(text)
  expect(alert.querySelector('button')).toBeNull()

  // The first content in the main part of the page, so before the caption
  // and the H1
  const main = document.querySelector('main')
  expect(main.querySelector('*:not(div)')).toBe(
    alert.querySelector('*:not(div)')
  )
}
