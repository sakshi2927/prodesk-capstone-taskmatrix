type JsonRequestInit = RequestInit & {
  timeoutMs?: number;
};

export class RequestTimeoutError extends Error {
  constructor(message = "The request timed out. Try again in a moment.") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

export class RequestError extends Error {
  status: number;

  statusText: string;

  body: unknown;

  constructor(message: string, status: number, statusText: string, body: unknown) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as {
    error?: unknown;
    message?: unknown;
    details?: unknown;
  };

  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error.trim();
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message.trim();
  }

  if (typeof candidate.details === "string" && candidate.details.trim()) {
    return candidate.details.trim();
  }

  return null;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) ||
    (error instanceof Error && error.name === "AbortError") ||
    (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ABORT_ERR");
}

export function getRequestErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof RequestTimeoutError) {
    return error.message;
  }

  if (error instanceof RequestError) {
    return extractMessage(error.body) ?? error.message ?? fallbackMessage;
  }

  if (isAbortError(error)) {
    return fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}

export async function requestJson<T>(input: RequestInfo | URL, init: JsonRequestInit = {}): Promise<T> {
  const { timeoutMs, signal, headers, ...rest } = init;
  const requestHeaders = headers ? new Headers(headers) : new Headers();
  const timeoutController = timeoutMs ? new AbortController() : null;
  let timedOut = false;
  let abortListener: (() => void) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutController) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        timeoutController.abort();
      } else {
        abortListener = () => timeoutController.abort();
        signal.addEventListener("abort", abortListener, { once: true });
      }
    }
  }

  try {
    const response = await fetch(input, {
      ...rest,
      headers: requestHeaders,
      signal: timeoutController?.signal ?? signal,
    });

    const body = (await response.json().catch(() => null)) as T | { error?: unknown; message?: unknown; details?: unknown } | null;

    if (!response.ok) {
      const message = extractMessage(body) ?? (response.statusText || "Request failed.");
      throw new RequestError(message, response.status, response.statusText, body);
    }

    return body as T;
  } catch (error) {
    if (timedOut && isAbortError(error)) {
      throw new RequestTimeoutError();
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (signal && abortListener) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}