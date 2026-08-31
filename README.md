# Segmentationapi TypeScript Library

[![fern shield](https://img.shields.io/badge/%F0%9F%8C%BF-Built%20with%20Fern-brightgreen)](https://buildwithfern.com?utm_source=github&utm_medium=github&utm_campaign=readme&utm_source=https%3A%2F%2Fgithub.com%2FsegmentationAPI%2Fsdk)
[![npm shield](https://img.shields.io/npm/v/@segmentationapi/sdk)](https://www.npmjs.com/package/@segmentationapi/sdk)

The Segmentationapi TypeScript library provides convenient access to the Segmentationapi APIs from TypeScript.

## Table of Contents

- [Install](#install)
- [Create A Client](#create-a-client)
- [Upload and Create A Job](#upload-and-create-a-job)
- [Retrieve Status and Results](#retrieve-status-and-results)
- [List Jobs](#list-jobs)
- [Account and Api Keys](#account-and-api-keys)
- [Errors and Request Options](#errors-and-request-options)
- [Development](#development)
- [License](#license)
- [Installation](#installation)
- [Reference](#reference)
- [Usage](#usage)
- [Environments](#environments)
- [Request and Response Types](#request-and-response-types)
- [Exception Handling](#exception-handling)
- [Advanced](#advanced)
  - [Subpackage Exports](#subpackage-exports)
  - [Additional Headers](#additional-headers)
  - [Additional Query String Parameters](#additional-query-string-parameters)
  - [Retries](#retries)
  - [Timeouts](#timeouts)
  - [Aborting Requests](#aborting-requests)
  - [Access Raw Response Data](#access-raw-response-data)
  - [Logging](#logging)
  - [Custom Fetch](#custom-fetch)
  - [Runtime Compatibility](#runtime-compatibility)
- [Contributing](#contributing)

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
`client.jobs`, `client.uploads`, `client.account`, `client.apiKeys`, and
`client.billing`. A live `sk_live_...` key is an unrestricted Account secret.

New accounts receive 100 free image tokens without a card. The 14-day period
starts when the first production job is accepted. A job may contain up to three
JPEG, PNG, or WebP images; video requires paid access. Only successfully
processed images consume tokens, and the quota is approximate under concurrent
requests. All processing uses `client.jobs.create()`.

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

The same SDK manages the Account with either an API key or an access token:

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
Trial errors also expose `remainingTokens`, `requestedTokens`, `expiresAt`,
`activeJobId`, `upgradeUrl`, and `retryAfterSeconds` when supplied by the API.

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

## Installation

```sh
npm i -s @segmentationapi/sdk
```

## Reference

A full reference for this library is available [here](https://github.com/segmentationAPI/sdk/blob/HEAD/./reference.md).

## Usage

Instantiate and use the client with the following:

```typescript
import { SegmentationApiClient } from "@segmentationapi/sdk";

const client = new SegmentationApiClient({ token: "YOUR_TOKEN" });
await client.uploads.createUploadPresign({
    contentType: "image/png"
});
```

## Environments

This SDK allows you to configure different environments for API requests.

```typescript
import { SegmentationApiClient, SegmentationApiEnvironment } from "@segmentationapi/sdk";

const client = new SegmentationApiClient({
    environment: SegmentationApiEnvironment.Default,
});
```

## Request and Response Types

The SDK exports all request and response types as TypeScript interfaces. Simply import them with the
following namespace:

```typescript
import { SegmentationApi } from "@segmentationapi/sdk";

const request: SegmentationApi.PresignUploadRequest = {
    ...
};
```

## Exception Handling

When the API returns a non-success status code (4xx or 5xx response), a subclass of the following error
will be thrown.

```typescript
import { SegmentationApiError } from "@segmentationapi/sdk";

try {
    await client.uploads.createUploadPresign(...);
} catch (err) {
    if (err instanceof SegmentationApiError) {
        console.log(err.statusCode);
        console.log(err.message);
        console.log(err.body);
        console.log(err.rawResponse);
    }
}
```

## Advanced

### Subpackage Exports

This SDK supports direct imports of subpackage clients, which allows JavaScript bundlers to tree-shake and include only the imported subpackage code. This results in much smaller bundle sizes.

```typescript
import { UploadsClient } from '@segmentationapi/sdk/uploads';

const client = new UploadsClient({...});
```

### Additional Headers

If you would like to send additional headers as part of the request, use the `headers` request option.

```typescript
import { SegmentationApiClient } from "@segmentationapi/sdk";

const client = new SegmentationApiClient({
    ...
    headers: {
        'X-Custom-Header': 'custom value'
    }
});

const response = await client.uploads.createUploadPresign(..., {
    headers: {
        'X-Custom-Header': 'custom value'
    }
});
```

### Additional Query String Parameters

If you would like to send additional query string parameters as part of the request, use the `queryParams` request option.

```typescript
const response = await client.uploads.createUploadPresign(..., {
    queryParams: {
        'customQueryParamKey': 'custom query param value'
    }
});
```

### Retries

The SDK is instrumented with automatic retries with exponential backoff. A request will be retried as long
as the request is deemed retryable and the number of retry attempts has not grown larger than the configured
retry limit (default: 2).

Which status codes are retried depends on the `retryStatusCodes` generator configuration:

**`legacy`** (current default): retries on
- [408](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408) (Timeout)
- [429](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429) (Too Many Requests)
- [5XX](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses) (All server errors, including 500)

**`recommended`**: retries on
- [408](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408) (Timeout)
- [429](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429) (Too Many Requests)
- [502](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/502) (Bad Gateway)
- [503](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503) (Service Unavailable)
- [504](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/504) (Gateway Timeout)

Use the `maxRetries` request option to configure this behavior.

```typescript
const response = await client.uploads.createUploadPresign(..., {
    maxRetries: 0 // override maxRetries at the request level
});
```

### Timeouts

The SDK defaults to a 60 second timeout. Use the `timeoutInSeconds` option to configure this behavior.

```typescript
const response = await client.uploads.createUploadPresign(..., {
    timeoutInSeconds: 30 // override timeout to 30s
});
```

### Aborting Requests

The SDK allows users to abort requests at any point by passing in an abort signal.

```typescript
const controller = new AbortController();
const response = await client.uploads.createUploadPresign(..., {
    abortSignal: controller.signal
});
controller.abort(); // aborts the request
```

### Access Raw Response Data

The SDK provides access to raw response data, including headers, through the `.withRawResponse()` method.
The `.withRawResponse()` method returns a promise that results to an object with a `data` and a `rawResponse` property.

```typescript
const { data, rawResponse } = await client.uploads.createUploadPresign(...).withRawResponse();

console.log(data);
console.log(rawResponse.headers['X-My-Header']);
```

### Logging

The SDK supports logging. You can configure the logger by passing in a `logging` object to the client options.

```typescript
import { SegmentationApiClient, logging } from "@segmentationapi/sdk";

const client = new SegmentationApiClient({
    ...
    logging: {
        level: logging.LogLevel.Debug, // defaults to logging.LogLevel.Info
        logger: new logging.ConsoleLogger(), // defaults to ConsoleLogger
        silent: false, // defaults to true, set to false to enable logging
    }
});
```
The `logging` object can have the following properties:
- `level`: The log level to use. Defaults to `logging.LogLevel.Info`.
- `logger`: The logger to use. Defaults to a `logging.ConsoleLogger`.
- `silent`: Whether to silence the logger. Defaults to `true`.

The `level` property can be one of the following values:
- `logging.LogLevel.Debug`
- `logging.LogLevel.Info`
- `logging.LogLevel.Warn`
- `logging.LogLevel.Error`

To provide a custom logger, you can pass in an object that implements the `logging.ILogger` interface.

<details>
<summary>Custom logger examples</summary>

Here's an example using the popular `winston` logging library.
```ts
import winston from 'winston';

const winstonLogger = winston.createLogger({...});

const logger: logging.ILogger = {
    debug: (msg, ...args) => winstonLogger.debug(msg, ...args),
    info: (msg, ...args) => winstonLogger.info(msg, ...args),
    warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
    error: (msg, ...args) => winstonLogger.error(msg, ...args),
};
```

Here's an example using the popular `pino` logging library.

```ts
import pino from 'pino';

const pinoLogger = pino({...});

const logger: logging.ILogger = {
  debug: (msg, ...args) => pinoLogger.debug(args, msg),
  info: (msg, ...args) => pinoLogger.info(args, msg),
  warn: (msg, ...args) => pinoLogger.warn(args, msg),
  error: (msg, ...args) => pinoLogger.error(args, msg),
};
```
</details>


### Custom Fetch

The SDK provides a low-level `fetch` method for making custom HTTP requests while still
benefiting from SDK-level configuration like authentication, retries, timeouts, and logging.
This is useful for calling API endpoints not yet supported in the SDK.

```typescript
const response = await client.fetch("/v1/custom/endpoint", {
    method: "GET",
}, {
    timeoutInSeconds: 30,
    maxRetries: 3,
    headers: {
        "X-Custom-Header": "custom-value",
    },
});

const data = await response.json();
```

### Runtime Compatibility


The SDK works in the following runtimes:



- Node.js 18+
- Vercel
- Cloudflare Workers
- Deno v1.25+
- Bun 1.0+
- React Native


## Contributing

While we value open-source contributions to this SDK, this library is generated programmatically.
Additions made directly to this library would have to be moved over to our generation code,
otherwise they would be overwritten upon the next generated release. Feel free to open a PR as
a proof of concept, but know that we will not be able to merge it as-is. We suggest opening
an issue first to discuss with us!

On the other hand, contributions to the README are always very welcome!
