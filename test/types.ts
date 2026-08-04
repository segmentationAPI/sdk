import {
  SegmentationAPI,
  type AsyncAcceptedResponse,
  type JobCreateRequest,
  type JobPage,
} from "../src/index.js";

declare const client: SegmentationAPI;

const bearerClient = new SegmentationAPI({ accessToken: async () => "token" });

const request: JobCreateRequest = {
  type: "image",
  tasks: ["task-1"],
  prompts: ["person"],
};

const accepted: Promise<AsyncAcceptedResponse> = client.jobs.create(request);
void accepted;

const page: Promise<JobPage> = client.jobs.list({ limit: 10, nextToken: "next" });
void page;
void client.jobs.retrieve("job-1");
void client.jobs.results.retrieve("job-1");
void client.jobs.downloads.create("job-1");
void client.jobs.downloads.retrieve("job-1");
void client.uploads.create({ contentType: "image/png" });
void client.playground.jobs.create({ tasks: ["task-1"], prompts: ["person"] });
void bearerClient.account.retrieve();
void bearerClient.account.overview.retrieve();
void bearerClient.apiKeys.list();
void bearerClient.apiKeys.create({ label: "Production" }, { idempotencyKey: "request-1" });
void bearerClient.apiKeys.revoke("key-1");
void bearerClient.billing.checkout.create({ idempotencyKey: "request-2" });
void bearerClient.billing.portal.create({ idempotencyKey: "request-3" });
void bearerClient.jobs.list({ mode: "batch", status: "success" });

// @ts-expect-error Generated transport wrappers are not part of the public request shape.
void client.jobs.create({ jobCreateRequest: request });

// @ts-expect-error The playground resource supplies its fixed image discriminator.
void client.playground.jobs.create({ type: "image", tasks: ["task-1"], prompts: ["person"] });

// @ts-expect-error Generated transport classes are intentionally not exported.
import { JobsApi } from "../src/index.js";
void JobsApi;
