// Shared fetch + bounded streaming read + JSON parse; decoded bytes are capped even without Content-Length.
export interface BoundedJsonOptions {
  signal: AbortSignal
  maxBytes: number
  /** Added to the fetch init only when given. */
  cache?: RequestCache
  /** Used in the status and no-body errors: "<label> request failed (404)." */
  label: string
  /** Full message for an exceeded budget. */
  budgetMessage: string
}

export async function fetchBoundedJson(url: string, opts: BoundedJsonOptions): Promise<unknown> {
  const { signal, maxBytes, cache, label, budgetMessage } = opts
  const response = await fetch(url, cache === undefined ? { signal } : { signal, cache })
  if (!response.ok) throw new Error(`${label} request failed (${response.status}).`)
  if (!response.body) throw new Error(`${label} response has no body.`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel()
        throw new Error(budgetMessage)
      }
      text += decoder.decode(value, { stream: true })
    }
    signal.throwIfAborted()
    return JSON.parse(text + decoder.decode()) as unknown
  } finally {
    reader.releaseLock()
  }
}
