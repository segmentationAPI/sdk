import type { BillingApi } from "../../generated/src/apis/BillingApi.js";
import type { BillingOverview } from "../../generated/src/models/BillingOverview.js";
import type { BillingUrl } from "../../generated/src/models/BillingUrl.js";
import { caughtErrorSchema, normalizeError } from "../errors.js";
import { createInitOverride } from "../request-options.js";
import type { IdempotentRequestOptions } from "./api-keys.js";

export type { BillingOverview };
export type BillingSession = BillingUrl;

export class Billing {
  readonly checkout: BillingCheckout;
  readonly portal: BillingPortal;

  constructor(api: BillingApi, defaultTimeout: number) {
    this.checkout = new BillingCheckout(api, defaultTimeout);
    this.portal = new BillingPortal(api, defaultTimeout);
  }
}

export class BillingCheckout {
  constructor(
    private readonly api: BillingApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(options: IdempotentRequestOptions): Promise<BillingSession> {
    try {
      return await this.api.createCheckout(
        { idempotencyKey: options.idempotencyKey },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}

export class BillingPortal {
  constructor(
    private readonly api: BillingApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(options: IdempotentRequestOptions): Promise<BillingSession> {
    try {
      return await this.api.createBillingPortal(
        { idempotencyKey: options.idempotencyKey },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}
