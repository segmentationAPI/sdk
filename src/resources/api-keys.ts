import type { DashboardApi } from "../../generated/src/apis/DashboardApi.js";
import type { DashboardApiKey } from "../../generated/src/models/DashboardApiKey.js";
import type { DashboardCreateApiKeyRequest } from "../../generated/src/models/DashboardCreateApiKeyRequest.js";
import type { DashboardCreateApiKeyResponse } from "../../generated/src/models/DashboardCreateApiKeyResponse.js";
import { caughtErrorSchema, normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type APIKey = DashboardApiKey;
export type APIKeyCreateParams = DashboardCreateApiKeyRequest;
export type APIKeyCreateResult = DashboardCreateApiKeyResponse;

export interface IdempotentRequestOptions extends RequestOptions {
  idempotencyKey: string;
}

export class APIKeys {
  constructor(
    private readonly api: DashboardApi,
    private readonly defaultTimeout: number,
  ) {}

  async list(options?: RequestOptions): Promise<ReadonlyArray<APIKey>> {
    try {
      const response = await this.api.listDashboardApiKeys(
        createInitOverride(options, this.defaultTimeout),
      );
      return response.items;
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }

  async create(
    request: APIKeyCreateParams,
    options: IdempotentRequestOptions,
  ): Promise<APIKeyCreateResult> {
    try {
      return await this.api.createDashboardApiKey(
        {
          dashboardCreateApiKeyRequest: request,
          idempotencyKey: options.idempotencyKey,
        },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }

  async revoke(keyId: string, options?: RequestOptions): Promise<APIKey> {
    try {
      const response = await this.api.revokeDashboardApiKey(
        { keyId },
        createInitOverride(options, this.defaultTimeout),
      );
      return response.apiKey;
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}
