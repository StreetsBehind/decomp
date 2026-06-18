// Drop-in `tests.mjs` for the scale-d1 anchor epic, graded by ORACLE #2 (the independent
// hand-authored oracle, src/oracle2.mjs). Shape-identical to build-gap/epics/scale-d1/tests.mjs
// so evaluateEpic loads it through the SAME isolated-child scoring path — only the detection
// mechanism differs. domainsFor(1) is the shared surface schema (the workspace surface set).
import { buildOracle2 } from '../../src/oracle2.mjs';
import { domainsFor } from '../../../build-gap/lib/scale-oracle.mjs';

const o = buildOracle2(domainsFor(1));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
