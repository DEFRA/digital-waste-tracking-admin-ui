/**
 * Gets the text from a DOM element.
 * @param {string} document - The HTML document
 * @param {string} dataTestId - The data-testid of the element
 * @returns {string | undefined} The element text if found, otherwise undefined
 */
export function getElementText(document, dataTestId) {
  return document
    .querySelector(`[data-testid="${dataTestId}"]`)
    ?.textContent.trim()
}
