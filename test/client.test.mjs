import assert from "node:assert/strict";
import test from "node:test";

import * as sdk from "../dist/src/index.js";

const { APIConnectionError, APIError, APITimeoutError, SegmentationAPI } = sdk;

test("exposes a semantic resource hierarchy and keeps generated internals private", () => {
  const client = new SegmentationAPI({ apiKey: "test-key", timeout: 0 });

  assert.ok(client.jobs.create instanceof Function);
  assert.ok(client.jobs.results.retrieve instanceof Function);
  assert.ok(client.jobs.downloads.create instanceof Function);
  assert.ok(client.uploads.create instanceof Function);
  assert.ok(client.account.retrieve instanceof Function);
  assert.ok(client.account.overview.retrieve instanceof Function);
  assert.ok(client.apiKeys.create instanceof Function);
  assert.ok(client.billing.checkout.create instanceof Function);
  assert.equal("JobsApi" in sdk, false);
  assert.equal("Configuration" in sdk, false);
});

test("uses the same semantic resources with bearer-token authentication", async () => {
  const requests = [];
  const client = new SegmentationAPI({
    accessToken: async () => "access-token",
    baseURL: "https://example.test",
    timeout: 0,
    fetch: async (url, init) => {
      requests.push({ url, init });
      const { pathname } = new URL(url);

      if (pathname === "/v1/account") {
        return json({
          accountId: "account-1",
          email: "user@example.test",
          emailVerified: true,
          image: null,
          name: "Example User",
          status: "active",
        });
      }
      if (pathname === "/v1/account/overview") {
        return json({ tokenUsageLast24h: 12, billing: { accessStatus: "allowed" } });
      }
      if (pathname === "/v1/api-keys" && init.method === "GET") {
        return json({ items: [apiKey()] });
      }
      if (pathname === "/v1/api-keys" && init.method === "POST") {
        return json({ apiKey: apiKey(), secret: "secret", secretUnavailable: false }, 201);
      }
      if (pathname === "/v1/api-keys/key-1") {
        return json({ apiKey: apiKey({ revoked: true }) });
      }
      if (pathname.startsWith("/v1/billing/")) {
        return json({ url: "https://billing.example.test" }, 201);
      }
      if (pathname === "/v1/uploads/presign") {
        return json({
          uploadUrl: "https://uploads.test",
          taskId: "task-1",
          bucket: "uploads",
          expiresIn: 300,
        });
      }
      if (pathname === "/v1/jobs" && init.method === "GET") {
        return json({ items: [jobSummary("job-1")], nextToken: null });
      }
      if (pathname === "/v1/jobs" && init.method === "POST") {
        return json({ jobId: "job-1", type: "image", totalItems: 1 }, 202);
      }
      if (pathname === "/v1/jobs/job-1") {
        return json({
          ...jobSummary("job-1"),
          tasks: [{ taskId: "task-1", status: "success" }],
        });
      }
      if (pathname.endsWith("/result")) {
        return json({ manifest: imageManifest(), assets: [], expiresIn: 300 });
      }
      if (pathname.endsWith("/download")) {
        return json({
          jobId: "job-1",
          status: "ready",
          expiresAt: "2026-08-03T13:00:00Z",
          downloadUrl: "https://downloads.test/job-1.zip",
          retryAfterSeconds: null,
          error: null,
        });
      }
      throw new Error(`Unexpected request: ${init.method} ${pathname}`);
    },
  });

  await client.account.retrieve();
  await client.account.overview.retrieve();
  await client.apiKeys.list();
  await client.apiKeys.create({ label: "Production" }, { idempotencyKey: "key-create" });
  await client.apiKeys.revoke("key-1");
  await client.billing.checkout.create({ idempotencyKey: "checkout" });
  await client.billing.portal.create({ idempotencyKey: "portal" });
  await client.uploads.create({ contentType: "image/png" });
  await client.jobs.create({ type: "image", tasks: ["task-1"], prompts: ["person"] });
  const page = await client.jobs.list({ status: "success" });
  const job = await client.jobs.retrieve("job-1");
  await client.jobs.results.retrieve("job-1");
  await client.jobs.downloads.create("job-1");
  await client.jobs.downloads.retrieve("job-1");

  assert.equal(page.items[0].processingMode, "single");
  assert.ok(page.items[0].createdAt instanceof Date);
  assert.equal(job.tasks[0].taskId, "task-1");
  for (const { init } of requests) {
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer access-token");
  }
  assert.equal(new Headers(requests[3].init.headers).get("idempotency-key"), "key-create");
  assert.equal(
    requests.some(({ url }) => new URL(url).pathname === "/v1/jobs"),
    true,
  );
});

test("maps semantic methods to authenticated API requests", async () => {
  const requests = [];
  const client = new SegmentationAPI({
    apiKey: "test-key",
    baseURL: "https://example.test/",
    timeout: 0,
    fetch: async (url, init) => {
      requests.push({ url, init });
      const { pathname } = new URL(url);

      if (pathname === "/v1/uploads/presign") {
        return json({
          uploadUrl: "https://uploads.test",
          taskId: "task-1",
          bucket: "uploads",
          expiresIn: 900,
        });
      }
      if (pathname.endsWith("/result")) {
        return json({ manifest: imageManifest(), assets: [], expiresIn: 900 });
      }
      if (pathname.endsWith("/download")) {
        return json({
          jobId: "job/1",
          status: "pending",
          expiresAt: null,
          downloadUrl: null,
          retryAfterSeconds: 2,
          error: null,
        });
      }
      if (pathname === "/v1/jobs/job%2F1") {
        return json({
          jobId: "job/1",
          type: "image",
          processingMode: "single",
          status: "success",
          totalItems: 1,
          createdAt: "2026-08-03T12:00:00Z",
          updatedAt: "2026-08-03T12:01:00Z",
          tasks: [],
        });
      }
      return json({ jobId: "job/1", type: "image", totalItems: 1 }, 202);
    },
  });

  await client.uploads.create(
    { contentType: "image/png" },
    { headers: { "x-correlation-id": "request-1" } },
  );
  await client.jobs.create({ type: "image", tasks: ["task-1"], prompts: ["person"] });
  await client.jobs.retrieve("job/1");
  await client.jobs.results.retrieve("job/1");
  await client.jobs.downloads.create("job/1");
  await client.jobs.downloads.retrieve("job/1");

  assert.deepEqual(
    requests.map(({ url, init }) => [init.method, new URL(url).pathname]),
    [
      ["POST", "/v1/uploads/presign"],
      ["POST", "/v1/jobs"],
      ["GET", "/v1/jobs/job%2F1"],
      ["GET", "/v1/jobs/job%2F1/result"],
      ["POST", "/v1/jobs/job%2F1/download"],
      ["GET", "/v1/jobs/job%2F1/download"],
    ],
  );

  const uploadHeaders = new Headers(requests[0].init.headers);
  assert.equal(uploadHeaders.get("authorization"), "Bearer test-key");
  assert.equal(uploadHeaders.get("x-correlation-id"), "request-1");
  assert.equal(JSON.parse(requests[1].init.body).type, "image");
});

test("auto-paginates job listings", async () => {
  const urls = [];
  const client = new SegmentationAPI({
    apiKey: "test-key",
    timeout: 0,
    fetch: async (url) => {
      urls.push(url);
      const nextToken = new URL(url).searchParams.get("nextToken");
      return json({
        items: [jobSummary(nextToken === null ? "job-1" : "job-2")],
        nextToken: nextToken === null ? "page-2" : null,
      });
    },
  });

  const page = await client.jobs.list({ limit: 1 });
  assert.equal(page.hasNextPage, true);

  const jobIds = [];
  for await (const job of page) {
    jobIds.push(job.jobId);
  }

  assert.deepEqual(jobIds, ["job-1", "job-2"]);
  assert.equal(new URL(urls[0]).searchParams.get("limit"), "1");
  assert.equal(new URL(urls[1]).searchParams.get("nextToken"), "page-2");
});

test("throws a structured APIError for HTTP failures", async () => {
  const client = new SegmentationAPI({
    apiKey: "test-key",
    timeout: 0,
    fetch: async () =>
      json({ error: "invalid_request", message: "The request is invalid" }, 400, {
        "x-request-id": "request-1",
      }),
  });

  await assert.rejects(client.jobs.retrieve("job-1"), (error) => {
    assert.ok(error instanceof APIError);
    assert.equal(error.status, 400);
    assert.equal(error.code, "invalid_request");
    assert.equal(error.message, "The request is invalid");
    assert.equal(error.headers.get("x-request-id"), "request-1");
    return true;
  });
});

test("normalizes connection and timeout failures", async () => {
  const connectionClient = new SegmentationAPI({
    apiKey: "test-key",
    timeout: 0,
    fetch: async () => {
      throw new TypeError("offline");
    },
  });
  await assert.rejects(connectionClient.jobs.retrieve("job-1"), APIConnectionError);

  const timeoutClient = new SegmentationAPI({
    apiKey: "test-key",
    timeout: 0,
    fetch: async () => {
      throw new DOMException("timed out", "TimeoutError");
    },
  });
  await assert.rejects(timeoutClient.jobs.retrieve("job-1"), APITimeoutError);
});

test("rejects invalid client options", () => {
  assert.throws(() => new SegmentationAPI({}), /exactly one/);
  assert.throws(
    () => new SegmentationAPI({ apiKey: "test-key", accessToken: "access-token" }),
    /exactly one/,
  );
  assert.throws(() => new SegmentationAPI({ apiKey: "" }), /apiKey/);
  assert.throws(() => new SegmentationAPI({ accessToken: "" }), /accessToken/);
  assert.throws(() => new SegmentationAPI({ apiKey: "test-key", timeout: -1 }), /timeout/);
  assert.throws(() => new SegmentationAPI({ apiKey: "test-key", baseURL: "///" }), /baseURL/);
  assert.throws(
    () => new SegmentationAPI({ apiKey: "test-key", baseURL: "file:///tmp/api" }),
    /HTTP or HTTPS/,
  );
});

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function jobSummary(jobId) {
  return {
    jobId,
    type: "image",
    processingMode: "single",
    totalItems: 1,
    status: "success",
    createdAt: "2026-08-03T12:00:00Z",
    updatedAt: "2026-08-03T12:01:00Z",
  };
}

function apiKey(overrides = {}) {
  return {
    keyId: "key-1",
    label: "Production",
    prefix: "seg_123",
    revoked: false,
    revokedAt: null,
    createdAt: "2026-08-03T12:00:00Z",
    updatedAt: "2026-08-03T12:00:00Z",
    ...overrides,
  };
}

function imageManifest() {
  return { jobId: "job/1", type: "image", prompts: ["person"], items: [] };
}
