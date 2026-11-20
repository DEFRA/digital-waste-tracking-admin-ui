/**
 * Formats an amount of money for the given locale, such as "£1,234.00".
 * @param {number} value - The amount
 * @param {string} [locale] - The locale, such as "en-GB"
 * @param {string} [currency] - The ISO 4217 currency code, such as "GBP"
 * @returns {string} The amount, formatted as money
 */
export function formatCurrency(value, locale = 'en-GB', currency = 'GBP') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  })

  return formatter.format(value)
}
