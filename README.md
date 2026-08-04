# SegmentationAPI TypeScript SDK

The official TypeScript SDK for
[SegmentationAPI](https://www.segmentationapi.com/docs). It targets modern
JavaScript runtimes with the Fetch API, including Node.js 20 or later and
browsers.

> Keep API keys on a trusted server. Never expose a secret SegmentationAPI key
> in browser or other client-side code.

## Install

```sh
pnpm add @segmentationapi/sdk
```

## Create a client

```ts
import { SegmentationAPI } from "@segmentationapi/sdk";

const apiKey = process.env.SEGMENTATION_API_KEY;
if (!apiKey) {
  throw new Error("SEGMENTATION_API_KEY is required");
}

const client = new SegmentationAPI({ apiKey });
```

Browser and OAuth consumers use the same client and resource hierarchy with an
access-token provider:

```ts
const client = new SegmentationAPI({
  accessToken: getAccessToken,
  baseURL: "https://api.segmentationapi.com",
});
```

Both authentication modes use the same API routes and semantic resources:
`client.jobs`, `client.uploads`, and `client.playground`. Account, billing, and
API-key management require a bearer access token.

The client uses a 60-second request timeout by default. You can configure a
different timeout, API base URL, Fetch implementation, or default headers in
the constructor.

## Upload and create a job

```ts
const upload = await client.uploads.create({ contentType: "image/png" });

await fetch(upload.uploadUrl, {
  method: "PUT",
  headers: { "content-type": "image/png" },
  body: image,
});

const job = await client.jobs.create({
  type: "image",
  tasks: [upload.taskId],
  prompts: ["person"],
});
```

## Retrieve status and results

```ts
const status = await client.jobs.retrieve(job.jobId);

if (status.status === "success") {
  const result = await client.jobs.results.retrieve(job.jobId);
  console.log(result.assets);
}
```

Result archives are exposed as a nested resource:

```ts
const download = await client.jobs.downloads.create(job.jobId);
const currentDownload = await client.jobs.downloads.retrieve(job.jobId);
```

## List jobs

`client.jobs.list()` returns a page that can be inspected directly or consumed
as an async iterator. Iteration automatically fetches subsequent pages.

```ts
const firstPage = await client.jobs.list({ limit: 20 });
console.log(firstPage.items, firstPage.hasNextPage);

for await (const job of firstPage) {
  console.log(job.jobId, job.status);
}
```

## Account and API keys

Authenticated account consumers can use the same SDK for account, billing, and
API-key management:

```ts
const account = await client.account.retrieve();
const overview = await client.account.overview.retrieve();
const keys = await client.apiKeys.list();

await client.apiKeys.create({ label: "Production" }, { idempotencyKey: crypto.randomUUID() });

const checkout = await client.billing.checkout.create({
  idempotencyKey: crypto.randomUUID(),
});
```

## Errors and request options

HTTP failures throw `APIError`, with `status`, `code`, `body`, and `headers`.
Network and timeout failures throw `APIConnectionError` and `APITimeoutError`.

```ts
import { APIError } from "@segmentationapi/sdk";

try {
  await client.jobs.retrieve("job-id", {
    timeout: 10_000,
    signal: abortController.signal,
    headers: { "x-correlation-id": "request-id" },
  });
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.status, error.code, error.message);
  }
  throw error;
}
```

See the [API documentation](https://www.segmentationapi.com/docs) for request
fields, result formats, and the complete workflow.

## Development

The OpenAPI document is the source of truth. OpenAPI Generator exclusively owns
the `generated` directory; its files must not be edited manually. The semantic
client and resources are maintained separately under `src`.

From the monorepo root:

```sh
pnpm sdk:generate
pnpm turbo run lint check-types format:check test --filter=@segmentationapi/sdk
```

## License

[ISC](./LICENSE)
