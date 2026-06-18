// Drop-in `tests.mjs` for the scale-d2 epic, graded by ORACLE #2 (the independent
// hand-authored oracle, src/oracle2.mjs). Depth-parameterized sibling of oracle2-tests-d1.mjs:
// domainsFor(2) is the 9-surface schema (projects + vaults). Same isolated-child scoring path.
import { buildOracle2 } from '../../src/oracle2.mjs';
import { domainsFor } from '../../../build-gap/lib/scale-oracle.mjs';

const o = buildOracle2(domainsFor(2));
export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
