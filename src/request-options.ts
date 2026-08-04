import type { HTTPRequestInit, InitOverrideFunction } from "../generated/src/runtime.js";

export interface RequestOptions {
  /** Abort this request when the signal fires. */
  signal?: AbortSignal;
  /** Override the client timeout for this request. Set to `0` to disable it. */
  timeout?: number;
  /** Additional headers sent with this request. */
  headers?: Record<string, string>;
}

export function createInitOverride(
  options: RequestOptions | undefined,
  defaultTimeout: number,
): InitOverrideFunction {
  const timeout = options?.timeout ?? defaultTimeout;
  if (!Number.isFinite(timeout) || timeout < 0) {
    throw new RangeError("timeout must be a non-negative finite number");
  }

  return async ({ init }) => ({
    ...init,
    headers: mergeHeaders(init, options?.headers),
    signal: createSignal(options?.signal, timeout),
  });
}

function mergeHeaders(
  init: HTTPRequestInit,
  additionalHeaders: Record<string, string> | undefined,
): Headers {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(additionalHeaders ?? {})) {
    headers.set(name, value);
  }
  return headers;
}

function createSignal(signal: AbortSignal | undefined, timeout: number): AbortSignal | undefined {
  if (timeout === 0) {
    return signal;
  }

  const timeoutSignal = AbortSignal.timeout(timeout);
  return signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
}
