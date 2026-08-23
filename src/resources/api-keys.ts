import type { ApiKeysApi } from "../../generated/src/apis/ApiKeysApi.js";
import type { ApiKey } from "../../generated/src/models/ApiKey.js";
import type { CreateApiKeyRequest } from "../../generated/src/models/CreateApiKeyRequest.js";
import type { CreateApiKeyResponse } from "../../generated/src/models/CreateApiKeyResponse.js";
import { caughtErrorSchema, normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type APIKey = ApiKey;
export type APIKeyCreateParams = CreateApiKeyRequest;
export type APIKeyCreateResult = CreateApiKeyResponse;

export interface IdempotentRequestOptions extends RequestOptions {
  idempotencyKey: string;
}

export class APIKeys {
  constructor(
    private readonly api: ApiKeysApi,
    private readonly defaultTimeout: number,
  ) {}

  async list(options?: RequestOptions): Promise<ReadonlyArray<APIKey>> {
    try {
      const response = await this.api.listApiKeys(createInitOverride(options, this.defaultTimeout));
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
      return await this.api.createApiKey(
        {
          createApiKeyRequest: request,
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
      const response = await this.api.revokeApiKey(
        { keyId },
        createInitOverride(options, this.defaultTimeout),
      );
      return response.apiKey;
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}
