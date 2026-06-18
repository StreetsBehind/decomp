// G-DIVERSE-TEMPLATES — one validity gate for ALL diverse seam-topology templates (P3 prerequisite).
//
// For each template (approval, lifecycle, quota) it asserts the same G2 discipline that validates oracle #1:
//   (a) no false positive — the correct reference earns full marks (all buckets),
//   (b) K6 — genuine single-obligation mutants killed at ≥ 0.90 per lethal bucket.
// Plus a DIVERSITY check: every template's surface set is pairwise-disjoint AND disjoint from the frozen
// membership seam, so each adds a genuine seam-topology degree of freedom toward the n_eff floor (FREEZE §4).
//
// Additive: all templates + graders + this gate are under studies/meta-search/; build-gap is untouched.

import path from 'node:path';
import url from 'node:url';
import { evaluateEpic } from '../../build-gap/lib/epic-sandbox.mjs';
import { domainsFor, buildOracle } from '../../build-gap/lib/scale-oracle.mjs';
import { K6_KILL_FLOOR, LETHAL_BUCKETS } from '../src/config.mjs';
import { approvalRefImpls, approvalMutants, buildApprovalOracle, requestDomainsFor } from '../epics-src/approval.mjs';
import { lifecycleRefImpls, lifecycleMutants, buildLifecycleOracle, docDomainsFor } from '../epics-src/lifecycle.mjs';
import { quotaRefImpls, quotaMutants, buildQuotaOracle, walletDomainsFor } from '../epics-src/quota.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const tp = (f) => path.resolve(HERE, 'lib', f);
const rate = (b) => (b && b.total ? b.pass / b.total : 1);
const killedIn = (rr, bucket) => rate(rr[bucket]) < 1;

const TEMPLATES = [
  { name: 'approval', invariant: 'execute ⟹ approved-by-distinct-admin', surfaces: buildApprovalOracle(requestDomainsFor(1)).EXPECTS, ref: approvalRefImpls(requestDomainsFor(1)), mutants: approvalMutants(requestDomainsFor(1)), testsPath: tp('approval-tests-d1.mjs') },
  { name: 'lifecycle', invariant: 'legal state-transition ordering + gated read', surfaces: buildLifecycleOracle(docDomainsFor(1)).EXPECTS, ref: lifecycleRefImpls(docDomainsFor(1)), mutants: lifecycleMutants(docDomainsFor(1)), testsPath: tp('lifecycle-tests-d1.mjs') },
  { name: 'quota', invariant: 'counter conservation + no-overspend + idempotent', surfaces: buildQuotaOracle(walletDomainsFor(1)).EXPECTS, ref: quotaRefImpls(walletDomainsFor(1)), mutants: quotaMutants(walletDomainsFor(1)), testsPath: tp('quota-tests-d1.mjs') },
];

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // diversity: pairwise-disjoint surface sets, all disjoint from the membership seam.
  const membership = new Set(buildOracle(domainsFor(1)).EXPECTS);
  const strata = [{ name: 'membership', surfaces: [...membership] }, ...TEMPLATES.map((t) => ({ name: t.name, surfaces: t.surfaces }))];
  let disjoint = true; const overlaps = [];
  for (let i = 0; i < strata.length; i++) for (let j = i + 1; j < strata.length; j++) {
    const si = new Set(strata[i].surfaces); const ov = strata[j].surfaces.filter((s) => si.has(s));
    if (ov.length) { disjoint = false; overlaps.push(`${strata[i].name}∩${strata[j].name}={${ov.join(',')}}`); }
  }
  ok(`all ${strata.length} seam topologies are pairwise-distinct (disjoint surface sets)`, disjoint, disjoint ? strata.map((s) => s.name).join(', ') : overlaps.join(' '));

  // per-template validity (no-FP + K6).
  const report = {};
  for (const t of TEMPLATES) {
    const ref = await evaluateEpic({ mode: 'isolated', files: t.ref, testsPath: t.testsPath });
    ok(`[${t.name}] reference NOT killed (no false positive)`,
      LETHAL_BUCKETS.every((b) => rate(ref[b]) === 1) && rate(ref.happy) === 1,
      `happy ${ref.happy.pass}/${ref.happy.total} crosscut ${ref.crosscut.pass}/${ref.crosscut.total} integration ${ref.integration.pass}/${ref.integration.total}`);
    const tally = { crosscut: { k: 0, n: 0, miss: [] }, integration: { k: 0, n: 0, miss: [] } };
    for (const m of t.mutants) { const rr = await evaluateEpic({ mode: 'isolated', files: m.body, testsPath: t.testsPath }); tally[m.target].n++; if (killedIn(rr, m.target)) tally[m.target].k++; else tally[m.target].miss.push(m.id); }
    report[t.name] = {};
    for (const b of LETHAL_BUCKETS) { const x = tally[b]; const kr = x.n ? x.k / x.n : 1; report[t.name][b] = kr; ok(`[${t.name}] kill-rate[${b}] ≥ K6 (${K6_KILL_FLOOR})`, kr >= K6_KILL_FLOOR - 1e-9, `${kr.toFixed(3)} (${x.k}/${x.n})${x.miss.length ? ' missed: ' + x.miss.join(',') : ''}`); }
  }

  const pass = checks.every((c) => c.pass);
  return { name: 'G-diverse-templates validity + diversity gate', pass, checks, report };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => {
    for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`);
    console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`);
    process.exit(r.pass ? 0 : 1);
  });
}
