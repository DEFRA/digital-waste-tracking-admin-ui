/**
 * Gets the text from a DOM element.
 *
 * @param {String} document - The HTML document
 * @param {String} dataTestId - The data-testid of the element
 *
 * @returns {String | undefined} The element text if found, otherwise undefined
 */
export function getElementText(document, dataTestId) {
  return document
    .querySelector(`[data-testid="${dataTestId}"]`)
    ?.textContent.trim()
}
