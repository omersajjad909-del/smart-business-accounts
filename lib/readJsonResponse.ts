/**
 * Read a fetch response as JSON without throwing on a body that is not JSON.
 *
 * A gateway timeout, an oversized upload or a deploy error answers with plain
 * text or HTML. `res.json()` then throws, and Safari words that as "The string
 * did not match the expected pattern", which says nothing about what went wrong.
 * This hands back `{ error }` carrying the status instead, so the screen can
 * show the real cause.
 */
export async function readJsonResponse<T = any>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    const hint =
      res.status === 413 ? "The photo is too large for the server."
      : res.status === 504 || res.status === 408 ? "The server took too long to read the photo. Try again, or use a clearer, closer shot."
      : res.status === 404 ? "The scan service was not found — the latest update may not be live yet."
      : res.status === 401 || res.status === 403 ? "Not allowed — try logging in again."
      : `Unexpected reply from the server (${res.status}).`;
    return { error: hint } as T & { error?: string };
  }
}
