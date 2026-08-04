import type { PlaygroundApi } from "../../generated/src/apis/PlaygroundApi.js";
import type { AsyncAcceptedResponse } from "../../generated/src/models/AsyncAcceptedResponse.js";
import type { PlaygroundJobCreateRequest } from "../../generated/src/models/PlaygroundJobCreateRequest.js";
import { normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type PlaygroundJobCreateParams = Omit<PlaygroundJobCreateRequest, "type">;
export class Playground {
  readonly jobs: PlaygroundJobs;

  constructor(api: PlaygroundApi, defaultTimeout: number) {
    this.jobs = new PlaygroundJobs(api, defaultTimeout);
  }
}

export class PlaygroundJobs {
  constructor(
    private readonly api: PlaygroundApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(
    request: PlaygroundJobCreateParams,
    options?: RequestOptions,
  ): Promise<AsyncAcceptedResponse> {
    try {
      const body = { ...request, type: "image" as const };
      return await this.api.createPlaygroundJob(
        { playgroundJobCreateRequest: body },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }
}
