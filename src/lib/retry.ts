/**
 * fetch() with bounded retries + exponential backoff, for the external food
 * APIs (Open Food Facts, USDA), which occasionally time out or rate-limit.
 *
 * Retries on network errors and retryable HTTP statuses (408/425/429/5xx).
 * Aborts are never retried — they propagate immediately so a new keystroke
 * cancels in-flight requests cleanly.
 */

export interface RetryOptions {
  /** Extra attempts after the first (default 2 → up to 3 total). */
  retries?: number
  /** Base backoff in ms; grows as base * 2^attempt with jitter (default 400). */
  baseDelayMs?: number
  signal?: AbortSignal
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {},
): Promise<Response> {
  const retries = opts.retries ?? 2
  const baseDelayMs = opts.baseDelayMs ?? 400
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: opts.signal })
      // Retry retryable statuses unless we're out of attempts.
      if (!res.ok && RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        lastError = new Error(`HTTP ${res.status}`)
      } else {
        return res
      }
    } catch (err) {
      if (isAbort(err) || opts.signal?.aborted) throw err
      lastError = err
      if (attempt >= retries) throw err
    }
    // Exponential backoff with a little jitter before the next attempt.
    await sleep(baseDelayMs * 2 ** attempt + Math.random() * 100, opts.signal)
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed')
}
