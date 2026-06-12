#!/usr/bin/env node
// Kill-test #1 (BUILD-TOLERANT-REFRAME.md / RECONCILIATION.md §6): author the 2x2 cost-of-omission
// tagging of the CANONICAL hearth oracle (fixtures/hearth/outcome-manifest.json, 162 edges — the one
// the battery loads AND the one Step 3's seam pre-flight judged). Single-author tagging against the
// rubric below; a blind gateway cross-check (tools/quadrant-crosscheck.mjs) measures inter-rater
// agreement separately (RECONCILIATION change G: authored ground truth is incomplete by construction).
//
// RUBRIC (rubric v1.0, identical to the 84-edge pilot):
//   selfRevealing = would a SINGLE-HONEST-TENANT happy-path acceptance test FAIL if this edge is
//                   omitted? TRUE => the feature visibly breaks for one honest user/tenant.
//                   FALSE (silent) => the happy path still works but a security/tenancy/privacy/
//                   consistency/compliance guarantee is violated (only an adversary, a 2nd tenant,
//                   or an auditor sees it).
//   recovery      = cheap (local code add, no rework, no prior damage) | expensive (data-model /
//                   schema / ordering rework, OR a breach/corruption has already shipped).
//   quadrant      = lethal (silent+expensive) | loud-exp (selfRevealing+expensive) |
//                   cheap (selfRevealing+cheap) | silent-cheap (silent+cheap).
//
// Writes: fixtures/hearth/quadrant-tags.json (durable sidecar, keyed by from->to) and augments
// fixtures/hearth/outcome-manifest.json in place (adds selfRevealing/recovery/quadrant/quadrantConf
// to each requiredEdge, alongside the existing partition tag). Prints the distribution + cross-tab.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const MANIFEST = path.join(ROOT, 'fixtures', 'hearth', 'outcome-manifest.json');
const TAGS_OUT = path.join(ROOT, 'fixtures', 'hearth', 'quadrant-tags.json');

// quadrant code -> (selfRevealing, recovery)
const Q = {
  L: { quadrant: 'lethal', selfRevealing: false, recovery: 'expensive' },
  X: { quadrant: 'loud-exp', selfRevealing: true, recovery: 'expensive' },
  C: { quadrant: 'cheap', selfRevealing: true, recovery: 'cheap' },
  S: { quadrant: 'silent-cheap', selfRevealing: false, recovery: 'cheap' },
};
const CONF = { h: 'high', m: 'med', l: 'low' };

// [index, quadrantCode, confCode]. Rationale for each non-cheap edge derives from the edge's own `why`.
// Decision rule applied: authz-gate (X->authz-enforcement-middleware), authn-required
// (X->session-validate-middleware), tenant-scoping (X->tenant-scoping or tenancy containment ->org),
// audit-emit (audit-event-write->X), entitlement/integrity (assign/access to members), seat-overage,
// webhook-reconciliation, CSRF/state, AV-gate => SILENT+EXPENSIVE = lethal. Structural containment
// (task->project, team->org, role->membership, subscription->plan, file->task) => loud-exp. UI-drives,
// internal create/read/write, config reads, derive-from-events => cheap.
const D = [
  [0,'C','h'],[1,'C','m'],[2,'L','m'],[3,'C','h'],[4,'C','l'],[5,'C','h'],[6,'C','h'],[7,'C','l'],[8,'C','h'],[9,'C','h'],
  [10,'X','h'],[11,'X','h'],[12,'C','h'],[13,'C','h'],[14,'C','m'],[15,'X','m'],[16,'C','h'],[17,'C','h'],[18,'C','h'],[19,'C','m'],
  [20,'C','h'],[21,'C','m'],[22,'C','h'],[23,'C','h'],[24,'C','h'],[25,'C','h'],[26,'C','h'],[27,'C','m'],[28,'X','m'],[29,'C','h'],
  [30,'C','h'],[31,'C','m'],[32,'C','h'],[33,'C','h'],[34,'X','m'],[35,'C','m'],[36,'C','m'],[37,'C','m'],[38,'L','m'],[39,'L','h'],
  [40,'L','m'],[41,'C','m'],[42,'C','m'],[43,'L','h'],[44,'L','h'],[45,'L','h'],[46,'L','h'],[47,'L','m'],[48,'C','m'],[49,'C','m'],
  [50,'L','m'],[51,'L','h'],[52,'C','h'],[53,'C','h'],[54,'L','m'],[55,'X','h'],[56,'C','h'],[57,'L','m'],[58,'C','h'],[59,'L','m'],
  [60,'C','h'],[61,'C','h'],[62,'C','h'],[63,'C','h'],[64,'C','h'],[65,'C','h'],[66,'C','h'],[67,'C','h'],[68,'C','h'],[69,'L','m'],
  [70,'L','h'],[71,'L','m'],[72,'L','m'],[73,'L','m'],[74,'L','m'],[75,'L','m'],[76,'L','m'],[77,'L','h'],[78,'C','m'],[79,'C','m'],
  [80,'X','m'],[81,'C','h'],[82,'C','h'],[83,'C','m'],[84,'C','m'],[85,'C','h'],[86,'C','h'],[87,'L','m'],[88,'C','h'],[89,'C','h'],
  [90,'L','m'],[91,'L','h'],[92,'L','m'],[93,'L','m'],[94,'L','h'],[95,'L','h'],[96,'C','m'],[97,'C','m'],[98,'C','h'],[99,'C','h'],
  [100,'L','h'],[101,'L','h'],[102,'L','h'],[103,'L','m'],[104,'L','m'],[105,'L','h'],[106,'L','m'],[107,'L','m'],[108,'L','m'],[109,'L','h'],
  [110,'L','h'],[111,'C','m'],[112,'C','m'],[113,'C','h'],[114,'C','h'],[115,'C','h'],[116,'C','h'],[117,'C','h'],[118,'C','m'],[119,'C','m'],
  [120,'C','h'],[121,'C','h'],[122,'C','h'],[123,'C','m'],[124,'C','m'],[125,'C','m'],[126,'C','m'],[127,'C','m'],[128,'L','m'],[129,'C','h'],
  [130,'L','h'],[131,'L','h'],[132,'L','l'],[133,'C','m'],[134,'L','h'],[135,'X','m'],[136,'C','h'],[137,'C','h'],[138,'C','h'],[139,'L','m'],
  [140,'C','l'],[141,'C','h'],[142,'C','m'],[143,'C','m'],[144,'C','h'],[145,'L','h'],[146,'L','m'],[147,'C','m'],[148,'L','l'],[149,'L','m'],
  [150,'L','h'],[151,'L','l'],[152,'L','l'],[153,'L','l'],[154,'C','m'],[155,'C','m'],[156,'L','l'],[157,'C','m'],[158,'L','l'],[159,'L','m'],
  [160,'L','m'],[161,'L','h'],
];

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const edges = manifest.requiredEdges;
if (D.length !== edges.length) {
  console.error(`decision count ${D.length} != edge count ${edges.length}`);
  process.exit(1);
}

const tags = {};
for (const [i, qc, cc] of D) {
  const e = edges[i];
  if (!e) { console.error(`no edge at index ${i}`); process.exit(1); }
  const q = Q[qc];
  if (!q) { console.error(`bad quadrant code ${qc} at ${i}`); process.exit(1); }
  const key = `${e.fromPlanKey}->${e.toPlanKey}`;
  e.selfRevealing = q.selfRevealing;
  e.recovery = q.recovery;
  e.quadrant = q.quadrant;
  e.quadrantConf = CONF[cc];
  tags[key] = { selfRevealing: q.selfRevealing, recovery: q.recovery, quadrant: q.quadrant, conf: CONF[cc], why: e.why };
}

manifest._quadrantNote =
  'Each requiredEdge carries selfRevealing/recovery/quadrant/quadrantConf (rubric v1.0). ' +
  'quadrant: lethal=silent+expensive, loud-exp=selfRevealing+expensive, cheap=selfRevealing+cheap, ' +
  'silent-cheap=silent+cheap. Authored by tools/author-hearth-quadrants.mjs; sidecar in quadrant-tags.json.';

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(TAGS_OUT, JSON.stringify({ _rubricVersion: '1.0', tags }, null, 2) + '\n');

// ---- distribution + cross-tab ----
const QORDER = ['lethal', 'loud-exp', 'cheap', 'silent-cheap'];
const pct = (n) => `${((100 * n) / edges.length).toFixed(1)}%`;
const byQuad = edges.reduce((m, e) => ((m[e.quadrant] = (m[e.quadrant] || 0) + 1), m), {});
console.log(`\n=== CANONICAL hearth oracle: ${edges.length} required edges ===\n`);
console.log('Quadrant distribution:');
for (const q of QORDER) console.log(`  ${q.padEnd(13)} ${String(byQuad[q] || 0).padStart(3)}  (${pct(byQuad[q] || 0)})`);

console.log('\nQuadrant x partition cross-tab:');
const parts = ['intra-feature', 'seam'];
console.log('  ' + 'quadrant'.padEnd(13) + parts.map((p) => p.padStart(14)).join('') + '     total');
for (const q of QORDER) {
  const row = parts.map((p) => edges.filter((e) => e.quadrant === q && e.partition === p).length);
  const tot = row.reduce((a, b) => a + b, 0);
  if (tot === 0) continue;
  console.log('  ' + q.padEnd(13) + row.map((n) => String(n).padStart(14)).join('') + String(tot).padStart(10));
}
console.log('  ' + 'TOTAL'.padEnd(13) + parts.map((p) => String(edges.filter((e) => e.partition === p).length).padStart(14)).join('') + String(edges.length).padStart(10));

const lethal = edges.filter((e) => e.quadrant === 'lethal');
const byConf = lethal.reduce((m, e) => ((m[e.quadrantConf] = (m[e.quadrantConf] || 0) + 1), m), {});
console.log(`\nLethal-quadrant confidence (${lethal.length} edges): ${JSON.stringify(byConf)}`);
console.log(`  conservative floor (high-conf lethal only): ${lethal.filter((e) => e.quadrantConf === 'high').length} edges (${pct(lethal.filter((e) => e.quadrantConf === 'high').length)})`);

// How much of the UNIFORM edge-recall denominator is the cheap quadrant (recovered by the build for free)?
const cheapN = byQuad['cheap'] || 0;
console.log(`\nUniform edge recall is ${pct(cheapN)} composed of CHEAP-quadrant edges (the build discovers these for free).`);
console.log(`Of ${edges.filter((e) => e.partition === 'seam').length} seam edges, ${lethal.filter((e) => e.partition === 'seam').length} are lethal; of ${edges.filter((e) => e.partition === 'intra-feature').length} intra, ${lethal.filter((e) => e.partition === 'intra-feature').length} are lethal (partition is a COARSE proxy for quadrant).`);
console.log(`\nwrote ${path.relative(ROOT, MANIFEST)} (augmented) + ${path.relative(ROOT, TAGS_OUT)}`);
