// Dynamic grader resolver for TEST-set validation. evaluateEpic loads this as a testsPath in a child
// process; the env vars (propagated by evaluateEpic) select which topology/window grader to export. This
// lets the ≥80-epic TEST set be validated + materialized on demand from the pinned generator, rather than
// committing hundreds of static files — the content hash pins the generator + manifest, so regeneration is
// deterministic.
import { buildApprovalOracle, requestDomainsWindow } from '../epics-src/approval.mjs';
import { buildLifecycleOracle, docDomainsWindow } from '../epics-src/lifecycle.mjs';
import { buildQuotaOracle, walletDomainsWindow } from '../epics-src/quota.mjs';
import { buildOracle2 } from '../src/oracle2.mjs';
import { domainsFor } from '../../build-gap/lib/scale-oracle.mjs';

const topo = process.env.TS_TOPO;
const start = Number(process.env.TS_START || 0);
const size = Number(process.env.TS_SIZE || 1);

let o;
if (topo === 'approval') o = buildApprovalOracle(requestDomainsWindow(start, size));
else if (topo === 'lifecycle') o = buildLifecycleOracle(docDomainsWindow(start, size));
else if (topo === 'quota') o = buildQuotaOracle(walletDomainsWindow(start, size));
else if (topo === 'membership') o = buildOracle2(domainsFor(size)); // the independent 2nd oracle grades the membership stratum
else throw new Error(`unknown topology ${topo}`);

export const EXPECTS = o.EXPECTS;
export const happy = o.happy;
export const crosscut = o.crosscut;
export const integration = o.integration;
