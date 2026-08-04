import type { UploadsApi } from "../../generated/src/apis/UploadsApi.js";
import type { PresignUploadRequest } from "../../generated/src/models/PresignUploadRequest.js";
import { normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export interface Upload {
  uploadUrl: string;
  taskId: string;
  expiresIn: number;
  bucket: string;
}

export class Uploads {
  constructor(
    private readonly api: UploadsApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(request: PresignUploadRequest, options?: RequestOptions): Promise<Upload> {
    try {
      return await this.api.createUploadPresign(
        { presignUploadRequest: request },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }
}
