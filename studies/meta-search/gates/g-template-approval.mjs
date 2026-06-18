// G-TEMPLATE-APPROVAL — validity gate for diverse epic template #2 (the approval / SoD seam).
//
// A new seam topology is only usable in the P3 TEST set if its grader is a VALID oracle: the correct
// reference earns full lethal marks (no false positive) and a battery of genuine single-obligation mutants
// is detected at ≥ K6 (0.90) per lethal bucket — exactly the G2 discipline that validates oracle #1, now
// applied to the new template so it can join the ≥80-epic, n_eff-spanning TEST set (FREEZE §4 / DESIGN §5).
//
// It also asserts the new topology is genuinely DISTINCT from the membership seam (different surface set),
// so it adds a seam-topology degree of freedom rather than another clone.
//
// Additive: template + grader + gate live under studies/meta-search/; the frozen build-gap tree is untouched.

import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { approvalRefImpls, approvalMutants, requestDomainsFor, buildApprovalOracle } from '../epics-src/approval.mjs';
import { domainsFor, buildOracle } from '../../build-gap/lib/scale-oracle.mjs';
import { K6_KILL_FLOOR, LETHAL_BUCKETS } from '../src/config.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const TESTS = path.resolve(HERE, 'lib', 'approval-tests-d1.mjs');
const rate = (b) => (b && b.total ? b.pass / b.total : 1);
const killedIn = (rr, bucket) => rate(rr[bucket]) < 1;
const evalUnder = (files) => evaluateEpic({ mode: 'isolated', files, testsPath: TESTS });

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  const domains = requestDomainsFor(1);

  // distinctness: the new template's surface set must not be the membership seam's.
  const membershipSurfaces = new Set(buildOracle(domainsFor(1)).EXPECTS);
  const approvalSurfaces = buildApprovalOracle(domains).EXPECTS;
  ok('new seam topology is DISTINCT from the membership seam (disjoint surface set)',
    approvalSurfaces.every((s) => !membershipSurfaces.has(s)), `approval surfaces: ${approvalSurfaces.join(', ')}`);

  // (a) false-positive guard — the correct reference earns FULL marks (all buckets).
  const ref = await evalUnder(approvalRefImpls(domains));
  ok('reference build is NOT killed (no false positive)',
    LETHAL_BUCKETS.every((b) => rate(ref[b]) === 1) && rate(ref.happy) === 1,
    `happy ${ref.happy.pass}/${ref.happy.total} crosscut ${ref.crosscut.pass}/${ref.crosscut.total} integration ${ref.integration.pass}/${ref.integration.total}`);

  // (b) K6 kill-rate per lethal bucket on the genuine mutant battery.
  const tally = { crosscut: { killed: 0, total: 0, missed: [] }, integration: { killed: 0, total: 0, missed: [] } };
  for (const m of approvalMutants(domains)) {
    const rr = await evalUnder(m.body);
    const killed = killedIn(rr, m.target);
    tally[m.target].total++;
    if (killed) tally[m.target].killed++; else tally[m.target].missed.push(m.id);
  }
  const killRates = {};
  for (const b of LETHAL_BUCKETS) {
    const t = tally[b];
    const kr = t.total ? t.killed / t.total : 1;
    killRates[b] = kr;
    ok(`kill-rate[${b}] ≥ K6 (${K6_KILL_FLOOR})`, kr >= K6_KILL_FLOOR - 1e-9, `${kr.toFixed(3)} (${t.killed}/${t.total})${t.missed.length ? ' missed: ' + t.missed.join(',') : ''}`);
  }

  const pass = checks.every((c) => c.pass);
  return { name: 'G-template-approval validity gate', pass, checks, killRates, tally };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => {
    for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`);
    console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`);
    process.exit(r.pass ? 0 : 1);
  });
}
