// Drop-in `tests.mjs` for quota-d1, graded by the independent property-based grader.
import { buildQuotaOracle, walletDomainsFor } from '../../epics-src/quota.mjs';
const o = buildQuotaOracle(walletDomainsFor(1));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
