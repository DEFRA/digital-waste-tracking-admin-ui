// Any origin will do, as only whether the path stays on it matters
const thisSite = 'https://this-site.invalid'

/**
 * Where to send the user after signing in, as long as it's a page on this
 * site. Browsers ignore tabs and newlines in an address, and read "//" and "/\"
 * as another site, so the path is read the way a browser would read it,
 * rather than checked as text.
 *
 * @param {unknown} path - Where they were going, e.g. from ?redirectTo=
 * @param {String} [fallback='/']
 * @returns {String}
 */
export function safeRedirectPath(path, fallback = '/') {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return fallback
  }

  const url = URL.parse(path, thisSite)

  // Resolving "." and ".." can leave "//" at the start, as in "/.//example.com"
  return url?.origin === thisSite && !url.pathname.startsWith('//')
    ? `${url.pathname}${url.search}`
    : fallback
}
