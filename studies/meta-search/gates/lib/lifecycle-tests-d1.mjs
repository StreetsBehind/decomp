// Drop-in `tests.mjs` for lifecycle-d1, graded by the independent property-based grader.
import { buildLifecycleOracle, docDomainsFor } from '../../epics-src/lifecycle.mjs';
const o = buildLifecycleOracle(docDomainsFor(1));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
