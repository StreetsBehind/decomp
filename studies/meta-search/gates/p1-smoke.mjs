// P1 deterministic smoke — validates the NEW P1 apparatus (reflective-proposer-driven mutation, the
// per-surface checker lever + repair, skeleton sourcing, the per-cell veto) WITHOUT any model spend, so the
// wiring is proven reproducibly before the live pilot. All synthetic / mock-backed; no gateway, no frontier.
//
// (The loop-closes-under-search property is already proven by the P0 K8 gate; here we additionally prove
// the proposer engages the operator path and the checker logic is correct in isolation.)

import url from 'node:url';
import { makeRng } from '../src/rng.mjs';
import { mutate } from '../src/operators.mjs';
import { makeHeuristicProposer } from '../src/proposer.mjs';
import { runChecker, deterministicViolations, declaredMemberStore, scanOracleLeak, applicableClauses, surfaceRole } from '../src/checker.mjs';
import { resolveSkeleton, chargeSkeletonAuthor } from '../src/skeleton-author.mjs';
import { makeLedger } from '../src/ledger.mjs';
import { defaultGenome, cloneGenome } from '../src/genome.mjs';

const SKEL = `## Shared contract\n- Project membership lives in \`ctx.db.members\` — an array of \`{ projectId, userId, role }\`.\n- Tenancy: stamp the caller's orgId.\n- Authorization: every addMember requires admin; post requires membership.`;

// minimal good/bad surface code samples (oracle-blind static-check fixtures)
const BAD_ADDMEMBER = `export function addMember(ctx, projectId, userId, role) { ctx.db.members.push({ projectId, userId, role }); return { projectId, userId, role }; }`;
const GOOD_ADDMEMBER = `export function addMember(ctx, projectId, userId, role) { if (ctx.session.role !== 'admin') throw new Error('forbidden'); const p = ctx.db.projects.get(projectId); if (!p || p.orgId !== ctx.session.orgId) throw new Error('tenancy'); ctx.db.members = ctx.db.members || []; ctx.db.members.push({ projectId, userId, role }); return { projectId, userId, role }; }`;

export async function run() {
  const checks = [];
  const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

  // 1) the reflective proposer drives mutate (source='reflective' on a lethal digest) -------------------
  const prop = makeHeuristicProposer();
  const rng = makeRng(7);
  const lethalDigest = { failCounts: { wire: 0, happy: 0, crosscut: 3, integration: 2 }, lethalFailCount: 5, quadrant: 'lethal-miss', harnessFail: false };
  let reflectiveFired = false, checkerOpProposed = false;
  for (let i = 0; i < 12; i++) {
    const m = await mutate(defaultGenome(), rng, { proposer: prop, digest: lethalDigest });
    if (m.source === 'reflective') reflectiveFired = true;
    if (['toggleChecker', 'checkerClasses', 'checkerRepair'].includes(m.op)) checkerOpProposed = true;
  }
  ok('reflective proposer drives the mutation path (source=reflective)', reflectiveFired);
  ok('on a lethal digest the proposer prefers a checker-strengthening operator', checkerOpProposed);

  // 2) checker static logic (oracle-blind) --------------------------------------------------------------
  ok('declaredMemberStore extracts the contract store name', declaredMemberStore(SKEL) === 'members', declaredMemberStore(SKEL));
  ok('surfaceRole classifies addMember', surfaceRole('addMember') === 'addMember');
  const clauses = applicableClauses('addMember', ['authz']);
  ok('applicableClauses(addMember,[authz]) includes authz AND the seam clause', clauses.some((c) => c.cls === 'authz') && clauses.some((c) => c.cls === 'seam'), clauses.map((c) => c.cls).join(','));
  const badV = deterministicViolations('addMember', BAD_ADDMEMBER, clauses, 'members');
  const goodV = deterministicViolations('addMember', GOOD_ADDMEMBER, clauses, 'members');
  ok('deterministic check FLAGS an addMember missing the admin guard', badV.length > 0, `violations: ${badV.length}`);
  ok('deterministic check PASSES a well-guarded addMember', goodV.length === 0, `violations: ${goodV.length}`);

  // 3) the repair loop fixes a flagged surface and stops when clean (mock rebuild, no gateway) ----------
  let rebuilds = 0;
  const chk = await runChecker({
    surface: 'addMember', code: BAD_ADDMEMBER, originalPrompt: 'implement addMember', skeleton: SKEL,
    checker: { kind: 'deterministic', obligationClasses: ['authz'], repairDepth: 2 },
    rebuild: async () => { rebuilds++; return { text: GOOD_ADDMEMBER }; },
    judgeInvoke: async () => ({ text: '{"ok":true}' }),
  });
  ok('checker repairs a flagged surface within repairDepth then stops clean', chk.repairs === 1 && chk.code === GOOD_ADDMEMBER && !chk.leak, `repairs=${chk.repairs}, violations=${chk.violations}, leak=${chk.leak}`);

  // 4) K3 oracle-leak scan voids a prompt carrying an oracle token --------------------------------------
  ok('scanOracleLeak catches an oracle token', scanOracleLeak('check the SEAM+ flow') === true);
  ok('scanOracleLeak passes clean contract text', scanOracleLeak('require the caller to be an admin') === false);
  const leaked = await runChecker({
    surface: 'addMember', code: BAD_ADDMEMBER, originalPrompt: 'implement addMember (see SEAM+@project)', skeleton: SKEL,
    checker: { kind: 'deterministic', obligationClasses: ['authz'], repairDepth: 1 },
    rebuild: async () => ({ text: GOOD_ADDMEMBER }), judgeInvoke: async () => ({ text: '{"ok":true}' }),
  });
  ok('a checker prompt carrying an oracle token sets leak=true (K3)', leaked.leak === true);

  // 5) skeleton sourcing + model-priced authoring cost --------------------------------------------------
  const gFusion = cloneGenome(defaultGenome()); gFusion.skeletonAuthor = { model: 'fusion', shapesIncluded: true, obligationDepth: 0 };
  const gSonnet = cloneGenome(defaultGenome()); gSonnet.skeletonAuthor = { model: 'sonnet', shapesIncluded: true, obligationDepth: 0 };
  const gOpus = cloneGenome(defaultGenome()); gOpus.skeletonAuthor = { model: 'opus', shapesIncluded: true, obligationDepth: 0 };
  const gOff = cloneGenome(defaultGenome()); gOff.skeletonAuthor = { model: 'fusion', shapesIncluded: false, obligationDepth: 0 };
  const rF = resolveSkeleton(gFusion, 'workspace'), rS = resolveSkeleton(gSonnet, 'workspace'), rO = resolveSkeleton(gOpus, 'workspace'), rN = resolveSkeleton(gOff, 'workspace');
  ok('skeleton text is injected when shapesIncluded, empty when not', rF.text.length > 50 && rN.text === '', `fusion ${rF.text.length} chars / off ${rN.text.length}`);
  const lF = makeLedger(), lS = makeLedger(), lO = makeLedger();
  const cF = chargeSkeletonAuthor(lF, rF), cS = chargeSkeletonAuthor(lS, rS), cO = chargeSkeletonAuthor(lO, rO);
  ok('cheaper-author cost ladder: fusion $0 < sonnet < opus (model-priced)', cF === 0 && cS > 0 && cO > cS, `fusion $${cF.toFixed(3)}, sonnet $${cS.toFixed(3)}, opus $${cO.toFixed(3)}`);
  ok('sonnet/opus authoring cost ≈ MCOH25 anchors ($0.09 / $0.40)', Math.abs(cS - 0.092) < 0.03 && Math.abs(cO - 0.40) < 0.06, `sonnet $${cS.toFixed(3)} (~0.092), opus $${cO.toFixed(3)} (~0.40)`);

  const pass = checks.every((c) => c.pass);
  return { name: 'P1 deterministic smoke (proposer + checker + repair + skeleton, no spend)', pass, checks };
}

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) {
  run().then((r) => { for (const c of r.checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`); console.log(`\n${r.pass ? 'OK' : 'FAIL'} — ${r.name}`); process.exit(r.pass ? 0 : 1); });
}
