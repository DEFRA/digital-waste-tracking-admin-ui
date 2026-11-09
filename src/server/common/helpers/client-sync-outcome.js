const outcomes = new Set(['success', 'failure', 'unknown'])

/**
 * Client Sync says in a 502 whether a change happened, and to which client
 * when it's known. Without that, only a refusal (4xx) means it didn't
 *
 * @param {Response} response - An error response, which never holds a secret
 *
 * @returns {Promise<{ outcome: 'success' | 'failure' | 'unknown', clientId?: String }>}
 */
export async function outcomeOf(response) {
  let body
  try {
    body = await response.json()
  } catch {
    // Unreadable, so fall back to the status
  }

  if (outcomes.has(body?.outcome)) {
    return {
      outcome: body.outcome,
      ...(typeof body.clientId === 'string' && { clientId: body.clientId })
    }
  }

  return { outcome: response.status < 500 ? 'failure' : 'unknown' }
}
