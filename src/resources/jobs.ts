import type { JobsApi } from "../../generated/src/apis/JobsApi.js";
import type { AsyncAcceptedResponse } from "../../generated/src/models/AsyncAcceptedResponse.js";
import type { JobCreateRequest } from "../../generated/src/models/JobCreateRequest.js";
import type { JobDownloadResponse } from "../../generated/src/models/JobDownloadResponse.js";
import type { JobResultResponse } from "../../generated/src/models/JobResultResponse.js";
import type { JobSummary as GeneratedJobSummary } from "../../generated/src/models/JobSummary.js";
import type { OutputManifest } from "../../generated/src/models/OutputManifest.js";
import type { ResultAsset } from "../../generated/src/models/ResultAsset.js";
import { normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type JobType = "image" | "video";
export type JobStatus = "queued" | "processing" | "success" | "failed";
export type ProcessingMode = "single" | "batch" | "video";

export interface JobSummary {
  jobId: string;
  type: JobType;
  processingMode: ProcessingMode;
  totalItems: number;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  error?: string | null;
}

export interface JobTask {
  taskId: string;
  status: JobStatus;
  error?: string | null;
}

export interface Job extends JobSummary {
  tasks: ReadonlyArray<JobTask>;
}

export interface JobResult {
  manifest: OutputManifest;
  assets: ReadonlyArray<ResultAsset>;
  expiresIn: number;
}

export interface JobListParams {
  /** Maximum number of jobs to return. */
  limit?: number;
  /** Cursor returned by a previous page. */
  nextToken?: string;
  /** Return a specific job identifier. */
  jobId?: string;
  /** Filter by processing mode. */
  mode?: ProcessingMode;
  /** Filter by status. */
  status?: JobStatus;
}

export class Jobs {
  readonly downloads: JobDownloads;
  readonly results: JobResults;

  constructor(
    private readonly api: JobsApi,
    private readonly defaultTimeout: number,
  ) {
    this.downloads = new JobDownloads(api, defaultTimeout);
    this.results = new JobResults(api, defaultTimeout);
  }

  async create(
    request: JobCreateRequest,
    options?: RequestOptions,
  ): Promise<AsyncAcceptedResponse> {
    try {
      return await this.api.createJob(
        { jobCreateRequest: request },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }

  async list(params: JobListParams = {}, options?: RequestOptions): Promise<JobPage> {
    try {
      const response = await this.api.listJobs(
        {
          jobId: params.jobId,
          limit: params.limit,
          mode: params.mode,
          nextToken: params.nextToken,
          status: params.status,
        },
        createInitOverride(options, this.defaultTimeout),
      );
      return new JobPage(
        response.items.map(normalizeJobSummary),
        response.nextToken,
        async (token, nextOptions) =>
          this.list({ ...params, nextToken: token }, nextOptions ?? options),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }

  async retrieve(jobId: string, options?: RequestOptions): Promise<Job> {
    try {
      const response = await this.api.retrieveJob(
        { jobId },
        createInitOverride(options, this.defaultTimeout),
      );
      return normalizeJob(response);
    } catch (error) {
      return normalizeError(error);
    }
  }
}

export class JobPage implements AsyncIterable<JobSummary> {
  constructor(
    readonly items: ReadonlyArray<JobSummary>,
    readonly nextToken: string | null,
    private readonly fetchNextPage: (
      nextToken: string,
      options?: RequestOptions,
    ) => Promise<JobPage>,
  ) {}

  get hasNextPage(): boolean {
    return this.nextToken !== null;
  }

  async getNextPage(options?: RequestOptions): Promise<JobPage | null> {
    return this.nextToken === null ? null : this.fetchNextPage(this.nextToken, options);
  }

  async *[Symbol.asyncIterator](): AsyncIterator<JobSummary> {
    yield* this.items;

    let page = await this.getNextPage();
    while (page !== null) {
      yield* page.items;
      page = await page.getNextPage();
    }
  }
}

export class JobResults {
  constructor(
    private readonly api: JobsApi,
    private readonly defaultTimeout: number,
  ) {}

  async retrieve(jobId: string, options?: RequestOptions): Promise<JobResult> {
    try {
      const response = await this.api.retrieveJobResult(
        { jobId },
        createInitOverride(options, this.defaultTimeout),
      );
      return response as JobResultResponse;
    } catch (error) {
      return normalizeError(error);
    }
  }
}

export class JobDownloads {
  constructor(
    private readonly api: JobsApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(jobId: string, options?: RequestOptions): Promise<JobDownloadResponse> {
    try {
      return await this.api.createJobDownload(
        { jobId },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }

  async retrieve(jobId: string, options?: RequestOptions): Promise<JobDownloadResponse> {
    try {
      return await this.api.retrieveJobDownload(
        { jobId },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }
}

function normalizeJobSummary(job: GeneratedJobSummary): JobSummary {
  return {
    jobId: job.jobId,
    type: job.type as JobType,
    processingMode: job.processingMode as ProcessingMode,
    totalItems: job.totalItems,
    status: job.status as JobStatus,
    createdAt: toDate(job.createdAt),
    updatedAt: toDate(job.updatedAt),
    ...(job.error !== undefined ? { error: job.error } : {}),
  };
}

function normalizeJob(job: Awaited<ReturnType<JobsApi["retrieveJob"]>>): Job {
  return {
    ...normalizeJobSummary(job),
    tasks: job.tasks.map((task) => ({
      taskId: task.taskId,
      status: task.status as JobStatus,
      ...(task.error !== undefined ? { error: task.error } : {}),
    })),
  };
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
