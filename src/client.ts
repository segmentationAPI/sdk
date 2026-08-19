import { DashboardApi } from "../generated/src/apis/DashboardApi.js";
import { JobsApi } from "../generated/src/apis/JobsApi.js";
import { PlaygroundApi } from "../generated/src/apis/PlaygroundApi.js";
import { UploadsApi } from "../generated/src/apis/UploadsApi.js";
import { Configuration } from "../generated/src/runtime.js";
import { z } from "zod";
import { Account } from "./resources/account.js";
import { APIKeys } from "./resources/api-keys.js";
import { Billing } from "./resources/billing.js";
import { Jobs } from "./resources/jobs.js";
import { Playground } from "./resources/playground.js";
import { Uploads } from "./resources/uploads.js";

const DEFAULT_BASE_URL = "https://api.segmentationapi.com";
const DEFAULT_TIMEOUT = 60_000;
const credentialSchema = z.union([z.string().trim().min(1), z.function()]);

type Credential = string | (() => string | Promise<string>);

interface SharedOptions {
  /** Override the production API URL, primarily for testing. */
  baseURL?: string;
  /** Default request timeout in milliseconds. Set to `0` to disable it. */
  timeout?: number;
  /** Additional headers sent with every request. */
  defaultHeaders?: Record<string, string>;
  /** Override the Fetch implementation. */
  fetch?: typeof globalThis.fetch;
  /** Called when the API responds with HTTP 401. */
  onUnauthorized?: () => void;
}

export type SegmentationAPIOptions = SharedOptions &
  (
    | {
        /** A secret SegmentationAPI key. Never expose it in browser code. */
        apiKey: Credential;
        accessToken?: never;
      }
    | {
        /** A bearer access token, or a provider that refreshes it when needed. */
        accessToken: Credential;
        apiKey?: never;
      }
  );

export class SegmentationAPI {
  readonly account: Account;
  readonly apiKeys: APIKeys;
  readonly billing: Billing;
  readonly jobs: Jobs;
  readonly playground: Playground;
  readonly uploads: Uploads;

  private readonly requestControllers = new Set<AbortController>();

  constructor(options: SegmentationAPIOptions) {
    validateAuth(options);
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw new RangeError("timeout must be a non-negative finite number");
    }

    const configuration = new Configuration({
      apiKey: options.apiKey,
      accessToken: options.accessToken,
      basePath: normalizeBaseURL(options.baseURL ?? DEFAULT_BASE_URL),
      fetchApi: this.createFetch(options.fetch ?? globalThis.fetch, options.onUnauthorized),
      headers: options.defaultHeaders,
    });

    const dashboardApi = new DashboardApi(configuration);

    this.account = new Account(dashboardApi, timeout);
    this.apiKeys = new APIKeys(dashboardApi, timeout);
    this.billing = new Billing(dashboardApi, timeout);
    this.jobs = new Jobs(new JobsApi(configuration), timeout);
    this.playground = new Playground(new PlaygroundApi(configuration), timeout);
    this.uploads = new Uploads(new UploadsApi(configuration), timeout);
  }

  /** Abort all requests currently in flight. */
  cancelAll(): void {
    for (const controller of this.requestControllers) controller.abort();
    this.requestControllers.clear();
  }

  private createFetch(
    fetchApi: typeof globalThis.fetch,
    onUnauthorized: (() => void) | undefined,
  ): typeof globalThis.fetch {
    return async (input, init) => {
      const controller = new AbortController();
      this.requestControllers.add(controller);
      try {
        const response = await fetchApi(input, {
          ...init,
          signal:
            init?.signal == null
              ? controller.signal
              : AbortSignal.any([init.signal, controller.signal]),
        });
        if (response.status === 401) onUnauthorized?.();
        return response;
      } finally {
        this.requestControllers.delete(controller);
      }
    };
  }
}

function validateAuth(options: SegmentationAPIOptions): void {
  const hasApiKey = options.apiKey !== undefined;
  const hasAccessToken = options.accessToken !== undefined;
  if (hasApiKey === hasAccessToken) {
    throw new TypeError("Provide exactly one of apiKey or accessToken");
  }

  const credential = hasApiKey ? options.apiKey : options.accessToken;
  if (!credentialSchema.safeParse(credential).success) {
    throw new TypeError(`${hasApiKey ? "apiKey" : "accessToken"} must not be empty`);
  }
}

function normalizeBaseURL(baseURL: string): string {
  const normalized = baseURL.replace(/\/+$/, "");
  if (normalized.length === 0) {
    throw new TypeError("baseURL must not be empty");
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch (cause) {
    throw new TypeError("baseURL must be a valid URL", { cause });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseURL must use HTTP or HTTPS");
  }

  return normalized;
}
