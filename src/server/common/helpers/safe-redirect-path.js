/**
 * Where to send the user after signing in, as long as it's a page on this
 * site. A path that starts with "//" or "/\" is another site to a browser, so
 * anything but a single leading slash goes to the fallback instead.
 *
 * @param {unknown} path - Where they were going, e.g. from ?redirectTo=
 * @param {String} [fallback='/']
 * @returns {String}
 */
export function safeRedirectPath(path, fallback = '/') {
  return typeof path === 'string' && /^\/(?![/\\])/.test(path) ? path : fallback
}
