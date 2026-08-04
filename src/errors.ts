import { FetchError, ResponseError } from "../generated/src/runtime.js";

export class APIError extends Error {
  override readonly name = "APIError";

  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    readonly body: unknown,
    readonly headers: Headers,
  ) {
    super(message);
  }
}

export class APIConnectionError extends Error {
  override readonly name: string = "APIConnectionError";

  constructor(message: string, options: ErrorOptions) {
    super(message, options);
  }
}

export class APITimeoutError extends APIConnectionError {
  override readonly name = "APITimeoutError";
}

export async function normalizeError(error: unknown): Promise<never> {
  if (error instanceof ResponseError) {
    const body = await readResponseBody(error.response);
    const code = getStringProperty(body, "error");
    const message =
      getStringProperty(body, "message") ??
      code ??
      `Request failed with status ${error.response.status}`;

    throw new APIError(message, error.response.status, code, body, error.response.headers);
  }

  if (error instanceof FetchError) {
    const ConnectionError =
      error.cause.name === "TimeoutError" ? APITimeoutError : APIConnectionError;
    throw new ConnectionError("Unable to connect to SegmentationAPI", { cause: error.cause });
  }

  throw error;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    return contentType.includes("json") ? await response.json() : await response.text();
  } catch {
    return undefined;
  }
}

function getStringProperty(value: unknown, property: string): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const propertyValue = Reflect.get(value, property);
  return typeof propertyValue === "string" ? propertyValue : undefined;
}
