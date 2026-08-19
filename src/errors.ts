import { FetchError, ResponseError } from "../generated/src/runtime.js";
import { z } from "zod";

const responseBodySchema = z.json();
const structuredErrorBodySchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});

export const caughtErrorSchema = z.union([
  z.instanceof(Error),
  z.unknown().transform((cause) => new Error("Unexpected non-Error thrown", { cause })),
]);
export type APIErrorBody = z.infer<typeof responseBodySchema> | undefined;

export class APIError extends Error {
  override readonly name = "APIError";

  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    readonly body: APIErrorBody,
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

export async function normalizeError(error: Error): Promise<never> {
  if (error instanceof ResponseError) {
    const body = await readResponseBody(error.response);
    const bodyResult = structuredErrorBodySchema.safeParse(body);
    const code = bodyResult.success ? bodyResult.data.error : undefined;
    const message =
      (bodyResult.success ? bodyResult.data.message : undefined) ??
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

async function readResponseBody(response: Response): Promise<APIErrorBody> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (!contentType.includes("json")) return await response.text();
    return responseBodySchema.parse(await response.json());
  } catch {
    return undefined;
  }
}
