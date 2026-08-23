import type { AccountApi } from "../../generated/src/apis/AccountApi.js";
import type { AccessOverview as GeneratedAccessOverview } from "../../generated/src/models/AccessOverview.js";
import type { Account as GeneratedAccount } from "../../generated/src/models/Account.js";
import type { AccountOverview as GeneratedAccountOverview } from "../../generated/src/models/AccountOverview.js";
import type { TrialOverview as GeneratedTrialOverview } from "../../generated/src/models/TrialOverview.js";
import { caughtErrorSchema, normalizeError } from "../errors.js";
import { createInitOverride, type RequestOptions } from "../request-options.js";

export type AccountDetails = GeneratedAccount;
export type AccountOverview = GeneratedAccountOverview;
export type AccessOverview = GeneratedAccessOverview;
export type TrialOverview = GeneratedTrialOverview;

export class Account {
  readonly overview: AccountOverviewResource;

  constructor(
    private readonly api: AccountApi,
    private readonly defaultTimeout: number,
  ) {
    this.overview = new AccountOverviewResource(api, defaultTimeout);
  }

  async retrieve(options?: RequestOptions): Promise<AccountDetails> {
    try {
      return await this.api.getAccount(createInitOverride(options, this.defaultTimeout));
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}

export class AccountOverviewResource {
  constructor(
    private readonly api: AccountApi,
    private readonly defaultTimeout: number,
  ) {}

  async retrieve(options?: RequestOptions): Promise<AccountOverview> {
    try {
      return await this.api.getAccountOverview(createInitOverride(options, this.defaultTimeout));
    } catch (error) {
      return normalizeError(caughtErrorSchema.parse(error));
    }
  }
}
