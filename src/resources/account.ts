import type { DashboardApi } from "../../generated/src/apis/DashboardApi.js";
import type { DashboardAccount } from "../../generated/src/models/DashboardAccount.js";
import type { DashboardOverview } from "../../generated/src/models/DashboardOverview.js";
import type { DashboardAccessOverview } from "../../generated/src/models/DashboardAccessOverview.js";
import type { DashboardTrialOverview } from "../../generated/src/models/DashboardTrialOverview.js";
import { caughtErrorSchema, normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type AccountDetails = DashboardAccount;
export type AccountOverview = DashboardOverview;
export type AccessOverview = DashboardAccessOverview;
export type TrialOverview = DashboardTrialOverview;

export class Account {
  readonly overview: AccountOverviewResource;

  constructor(
    private readonly api: DashboardApi,
    private readonly defaultTimeout: number,
  ) {
    this.overview = new AccountOverviewResource(api, defaultTimeout);
  }

  async retrieve(options?: RequestOptions): Promise<AccountDetails> {
    try {
      return await this.api.getDashboardAccount(createInitOverride(options, this.defaultTimeout));
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}

export class AccountOverviewResource {
  constructor(
    private readonly api: DashboardApi,
    private readonly defaultTimeout: number,
  ) {}

  async retrieve(options?: RequestOptions): Promise<AccountOverview> {
    try {
      return await this.api.getDashboardOverview(createInitOverride(options, this.defaultTimeout));
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}
