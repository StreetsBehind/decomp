// Drop-in `tests.mjs` for the scale-d3 epic, graded by ORACLE #2 (the independent
// hand-authored oracle, src/oracle2.mjs). Depth-parameterized sibling of oracle2-tests-d1.mjs:
// domainsFor(3) is the 13-surface schema (projects + vaults + trackers). Same isolated-child scoring path.
import { buildOracle2 } from '../../src/oracle2.mjs';
import { domainsFor } from '../../../build-gap/lib/scale-oracle.mjs';

const o = buildOracle2(domainsFor(3));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
