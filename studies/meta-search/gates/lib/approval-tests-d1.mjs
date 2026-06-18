// Drop-in `tests.mjs` for the approval-d1 epic, graded by the independent property-based grader in
// epics-src/approval.mjs. Shape-identical to a build-gap epic's tests.mjs so evaluateEpic scores it
// through the same isolated-child path.
import { buildApprovalOracle, requestDomainsFor } from '../../epics-src/approval.mjs';

const o = buildApprovalOracle(requestDomainsFor(1));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
