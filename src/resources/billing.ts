import type { DashboardApi } from "../../generated/src/apis/DashboardApi.js";
import type { DashboardBillingOverview } from "../../generated/src/models/DashboardBillingOverview.js";
import type { DashboardBillingUrl } from "../../generated/src/models/DashboardBillingUrl.js";
import { normalizeError } from "../errors.js";
import { createInitOverride } from "../request-options.js";
import type { IdempotentRequestOptions } from "./api-keys.js";

export type BillingOverview = DashboardBillingOverview;
export type BillingSession = DashboardBillingUrl;

export class Billing {
  readonly checkout: BillingCheckout;
  readonly portal: BillingPortal;

  constructor(api: DashboardApi, defaultTimeout: number) {
    this.checkout = new BillingCheckout(api, defaultTimeout);
    this.portal = new BillingPortal(api, defaultTimeout);
  }
}

export class BillingCheckout {
  constructor(
    private readonly api: DashboardApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(options: IdempotentRequestOptions): Promise<BillingSession> {
    try {
      return await this.api.createDashboardCheckout(
        { idempotencyKey: options.idempotencyKey },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }
}

export class BillingPortal {
  constructor(
    private readonly api: DashboardApi,
    private readonly defaultTimeout: number,
  ) {}

  async create(options: IdempotentRequestOptions): Promise<BillingSession> {
    try {
      return await this.api.createDashboardBillingPortal(
        { idempotencyKey: options.idempotencyKey },
        createInitOverride(options, this.defaultTimeout),
      );
    } catch (error) {
      return normalizeError(error);
    }
  }
}
