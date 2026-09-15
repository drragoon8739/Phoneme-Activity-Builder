/**
 * Browser-side wrapper around fetch.
 *
 * Every component talks to the API through this, so the envelope
 * ({ ok, data } / { ok, error }) is unwrapped in exactly one place. A failed
 * request throws an ApiError carrying the server's own message and per-field
 * errors, which means a component can show the real reason a save was rejected
 * instead of a generic "something went wrong".
 */

export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields ?? {};
  }
}

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // fetch only rejects on a network-level failure, which for a local app
    // almost always means the dev server or container is not running.
    throw new ApiError('Could not reach the server. Is it still running?', {
      status: 0,
      code: 'NETWORK',
    });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    const error = body?.error ?? {};
    throw new ApiError(error.message ?? `Request failed (${response.status})`, {
      status: response.status,
      code: error.code,
      fields: error.fields,
    });
  }

  return body.data;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

/**
 * Generation returns a file, not JSON, so it bypasses the envelope entirely
 * and saves the response straight to disk.
 */
export async function generateActivity(activityId) {
  const response = await fetch(`/api/activities/${activityId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    let message = `Generation failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      /* fall through to the default message */
    }
    throw new ApiError(message, { status: response.status });
  }

  const filename =
    response.headers.get('X-Generated-Filename') ?? 'phoneme-activity.html';
  const selectedWord = response.headers.get('X-Selected-Word');
  const includedWords = response.headers.get('X-Included-Words');

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, selectedWord, includedWords };
}
