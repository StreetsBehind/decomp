#!/usr/bin/env node
// P2a deterministic smoke — validates the CROSS-surface integration-gate lever with ZERO spend, plus the
// hash-safety of the new integrationGate genome node (the P0 trajectory must stay bit-identical). No gateway,
// no models: synthetic writer/reader code strings exercise the static seam logic + the route-back repair, and
// a mock rebuild proves the cross-surface injection. Mirrors gates/p1-smoke.mjs in spirit.

import url from 'node:url';
import {
  runIntegrationGate, seamPairs, seamIssues, deterministicSeamCheck, writtenStores, readStores, baseStores,
  memberStores, storeStyle, hasInit, writeStatements, membershipClause, surgicalInitRepair,
} from '../src/integration-gate.mjs';
import { scanOracleLeak } from '../src/checker.mjs';
import { defaultGenome, validateGenome, genomeHash, cloneGenome } from '../src/genome.mjs';

const checks = [];
const ok = (name, cond, detail = '') => checks.push({ name, pass: !!cond, detail });

// ---- synthetic surface code (the candidate's own emitted modules; public) -------------------------
const SKEL = 'The contract declares the membership store as ctx.db.memberships (Array). addMember writes a membership; postComment reads it.';

const BASE = 'ctx.db.users, ctx.db.projects, ctx.db.comments are the base data model.'; // memberships/members are NEW
// a writer/reader that AGREE and are INIT-SAFE (both Array on ctx.db.memberships, both ??= init)
const writerArr = `export function addMember(ctx, projectId, userId, role){ ctx.db.memberships ??= []; ctx.db.memberships.push({ id:'mem_'+1, projectId, userId, orgId: ctx.session.orgId, role }); return ctx.db.memberships.at(-1); }`;
const readerArr = `export function postComment(ctx, projectId, body){ ctx.db.memberships ??= []; const m = ctx.db.memberships.some(x => x.projectId===projectId && x.userId===ctx.session.userId); if(!m) throw new Error('forbidden'); ctx.db.comments.push({ projectId, body }); }`;
// MODE A: a writer/reader that ACCESS the store WITHOUT initializing it (undefined-crash at runtime)
const writerNoInit = `export function addMember(ctx, projectId, userId, role){ ctx.db.memberships.set(projectId+':'+userId, { projectId, userId, role }); return { projectId, userId, role }; }`;
const readerNoInit = `export function postComment(ctx, projectId, body){ if(!ctx.db.memberships.has(projectId+':'+ctx.session.userId)) throw new Error('forbidden'); ctx.db.comments.push({ projectId, body }); }`;
// MODE A, ARRAY-style (no init) — surgically repairable to AGREE with readerArr (both Array) with no model call.
const writerNoInitArr = `export function addMember(ctx, projectId, userId, role){ ctx.db.memberships.push({ projectId, userId, role, orgId: ctx.session.orgId }); return { projectId, userId, role }; }`;
// MODE A + an OBLIGATION GUARD (authz) — the surgical init repair must add init AND preserve the guard (the −3pp fix).
const writerNoInitGuarded = `export function addMember(ctx, projectId, userId, role){ if (ctx.session.orgId !== ctx.db.projects.get(projectId)?.orgId) throw new Error('forbidden'); ctx.db.memberships.push({ projectId, userId, role }); return { projectId, userId, role }; }`;
// MODE B: drift on store NAME (reads ctx.db.members, not memberships) — init-safe so Mode A doesn't mask it
const readerNameDrift = `export function postComment(ctx, projectId, body){ ctx.db.members ??= []; const m = ctx.db.members.some(x => x.projectId===projectId && x.userId===ctx.session.userId); if(!m) throw new Error('forbidden'); ctx.db.comments.push({ projectId, body }); }`;
// MODE B: drift on access STYLE (Map .has on a store the writer .push-es as an Array) — init-safe
const readerStyleDrift = `export function postComment(ctx, projectId, body){ ctx.db.memberships ??= new Map(); if(!ctx.db.memberships.has(projectId+':'+ctx.session.userId)) throw new Error('forbidden'); ctx.db.comments.push({ projectId, body }); }`;
// a reader that never reads any membership store at all (init-safe, but the membership check is missing)
const readerNoCheck = `export function postComment(ctx, projectId, body){ ctx.db.comments.push({ projectId, body }); return true; }`;

// ---- 1. extraction primitives ---------------------------------------------------------------------
ok('writtenStores finds the pushed membership store', memberStores(writtenStores(writerArr)).includes('memberships'));
ok('readStores finds the read membership store (array)', memberStores(readStores(readerArr)).includes('memberships'));
ok('readStores finds the read membership store (map .has)', memberStores(readStores(readerStyleDrift)).includes('memberships'));
ok('memberStores drops non-membership stores (comments/projects/users)', memberStores(new Set(['comments', 'projects', 'users', 'memberships'])).join() === 'memberships');
ok('storeStyle: writer array', storeStyle(writerArr, 'memberships') === 'array');
ok('storeStyle: reader map', storeStyle(readerStyleDrift, 'memberships') === 'map');
ok('writeStatements extracts the writer push line', /memberships\s*\.\s*push/.test(writeStatements(writerArr, ['memberships'])));

// ---- 2. the deterministic seam check --------------------------------------------------------------
ok('AGREE + init-safe → no mismatch', deterministicSeamCheck(writerArr, readerArr).mismatch === null);
{ const r = deterministicSeamCheck(writerArr, readerNameDrift); ok('NAME drift → mismatch flagged (Mode B)', r.mode === 'drift' && /different stores|members\b/.test(r.mismatch), r.mismatch || ''); }
{ const r = deterministicSeamCheck(writerArr, readerStyleDrift); ok('STYLE drift (array vs map) → mismatch flagged (Mode B)', r.mode === 'drift' && /array|map/.test(r.mismatch), r.mismatch || ''); }
{ const r = deterministicSeamCheck(writerArr, readerNoCheck); ok('reader never checks membership → mismatch flagged (Mode B)', r.mode === 'drift' && /never reads/.test(r.mismatch), r.mismatch || ''); }

// ---- 2b. MODE A — uninitialized shared store (the dominant N=5 failure) ----------------------------
ok('hasInit detects ??= init', hasInit(writerArr, 'memberships') === true);
ok('hasInit detects missing init', hasInit(writerNoInit, 'memberships') === false);
ok('hasInit detects if(!ctx.db.x) init', hasInit('if(!ctx.db.memberships){ctx.db.memberships=new Map();}', 'memberships') === true);
ok('baseStores extracts the base model from preamble text', baseStores('ctx.db.users a ctx.db.projects b ctx.db.comments').has('projects') && !baseStores('ctx.db.users').has('memberships'));
{ const r = deterministicSeamCheck(writerNoInit, readerArr); ok('writer accesses store without init → Mode A flagged on the WRITER', r.mode === 'init' && r.surface === 'writer' && /base data model/i.test(r.mismatch), `${r.mode}/${r.surface}`); }
{ const r = deterministicSeamCheck(writerArr, readerNoInit); ok('reader accesses store without init → Mode A flagged on the READER', r.mode === 'init' && r.surface === 'reader' && /undefined/.test(r.mismatch), `${r.mode}/${r.surface}`); }
{ const r = deterministicSeamCheck(writerNoInit, readerNoInit); ok('Mode A masks Mode B (init checked before drift)', r.mode === 'init'); }
ok('a base store accessed without init is NOT flagged', deterministicSeamCheck(writerArr, `export function postComment(ctx,p,b){ ctx.db.memberships ??= []; ctx.db.comments.push({}); ctx.db.memberships.some(()=>true); }`).mode !== 'init');

// ---- 3. seam pairing -------------------------------------------------------------------------------
ok('single-domain pairs the one writer with the one reader', JSON.stringify(seamPairs(['createProject', 'listProjects', 'addMember', 'postComment', 'updateProfile'])) === JSON.stringify([{ writer: 'addMember', reader: 'postComment' }]));
{ const p = seamPairs(['addMember', 'postComment', 'addVaultMember', 'postFile', 'updateProfile']); ok('multi-domain produces one pair per reader', p.length === 2, JSON.stringify(p)); }

// ---- 4. the gate is a no-op when off --------------------------------------------------------------
{
  const files = { addMember: writerArr, postComment: readerNameDrift };
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: {}, skeleton: SKEL, gate: { kind: 'off', repairDepth: 0 }, rebuild: async () => 'X', judgeInvoke: async () => ({ text: '' }) });
  ok('gate OFF is a no-op (ranGate false, no repairs)', r.ranGate === false && r.repairs === 0 && files.postComment === readerNameDrift);
}

// ---- 5. deterministic gate DETECTS drift and ROUTES BACK (cross-surface injection) -----------------
{
  const files = { addMember: writerArr, postComment: readerNameDrift };
  let injectedWriter = null, repairedSurface = null;
  const rebuild = async (surface, prompt) => {
    repairedSurface = surface;
    injectedWriter = /memberships\s*\.\s*push/.test(prompt); // the writer's write-statement is in the reader's repair prompt
    return readerArr; // the repaired reader now agrees (reads ctx.db.memberships as an array)
  };
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: { postComment: 'BUILD postComment' }, skeleton: SKEL, gate: { kind: 'deterministic', repairDepth: 1 }, rebuild, judgeInvoke: async () => ({ text: '' }) });
  ok('gate ON detects the seam mismatch', r.mismatches === 1, `mismatches=${r.mismatches}`);
  ok('gate routed the repair to the READER surface', repairedSurface === 'postComment');
  ok('repair prompt injected the WRITER write-statement (cross-surface signal)', injectedWriter === true);
  ok('repair replaced the reader code and the seam now composes', r.repairs === 1 && deterministicSeamCheck(files.addMember, files.postComment).mismatch === null);
}

// ---- 5b. MODE A gate REPAIR is now DETERMINISTIC + SURGICAL — no model rebuild, guard-preserving ----
{
  const files = { addMember: writerNoInitArr, postComment: readerArr };
  let rebuildCalled = false;
  const rebuild = async () => { rebuildCalled = true; return ''; };  // must NOT be called for a Mode-A init
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: { addMember: 'BUILD addMember' }, skeleton: SKEL, baseModel: BASE, gate: { kind: 'deterministic', repairDepth: 1 }, rebuild, judgeInvoke: async () => ({ text: '' }) });
  ok('Mode A: gate detected the uninitialized-store crash', r.mismatches === 1);
  ok('Mode A: the init repair is SURGICAL — no model rebuild was called', rebuildCalled === false);
  ok('Mode A: the writer now defensively inits the store (??= injected)', hasInit(files.addMember, 'memberships') === true);
  ok('Mode A: after the surgical init repair the seam composes', r.repairs === 1 && deterministicSeamCheck(files.addMember, files.postComment, baseStores(BASE)).mismatch === null);
}

// ---- 5c. surgical init repair PRESERVES obligation guards (the X-CUT −3pp fix) ----------------------
{
  const files = { addMember: writerNoInitGuarded, postComment: readerArr };
  let rebuildCalled = false;
  const rebuild = async () => { rebuildCalled = true; return ''; };
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: { addMember: 'BUILD addMember' }, skeleton: SKEL, baseModel: BASE, gate: { kind: 'deterministic', repairDepth: 1 }, rebuild, judgeInvoke: async () => ({ text: '' }) });
  ok('5c: the authz guard survives the surgical repair (no regeneration → no −3pp)', /ctx\.session\.orgId !== ctx\.db\.projects\.get\(projectId\)\?\.orgId/.test(files.addMember) && /throw new Error\('forbidden'\)/.test(files.addMember));
  ok('5c: init was still added AND no model rebuild was called', hasInit(files.addMember, 'memberships') === true && rebuildCalled === false && r.repairs === 1);
  ok('5c: unit — surgicalInitRepair injects an array init before first access, preserving the rest', (() => { const p = surgicalInitRepair(writerNoInitGuarded, 'memberships', 'array'); return /memberships \?\?= \[\];/.test(p) && p.includes("throw new Error('forbidden')"); })());
}

// ---- 6. repair budget respected (repairDepth 0 → detect but no repair) ------------------------------
{
  const files = { addMember: writerArr, postComment: readerNameDrift };
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: {}, skeleton: SKEL, gate: { kind: 'deterministic', repairDepth: 0 }, rebuild: async () => readerArr, judgeInvoke: async () => ({ text: '' }) });
  ok('repairDepth 0: mismatch counted, NO repair attempted', r.mismatches === 1 && r.repairs === 0 && files.postComment === readerNameDrift);
}

// ---- 7. cheap-judge path (mock judge) + K3 oracle-leak scan ----------------------------------------
{
  const files = { addMember: writerArr, postComment: readerArr };
  const judge = async () => ({ text: '{"agree": false, "mismatch": "reader keys differ"}' });
  let repaired = 0;
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: { postComment: 'P' }, skeleton: SKEL, gate: { kind: 'cheap-judge', repairDepth: 1 }, rebuild: async () => { repaired++; return readerArr; }, judgeInvoke: judge });
  ok('cheap-judge: disagreement triggers a repair', r.mismatches === 1 && repaired === 1);
}
{
  // a planted oracle token in a surface MUST trip the K3 scan and void (leak=true), like checker.mjs.
  const files = { addMember: writerArr + '\n// SEAM+@project leak', postComment: readerNameDrift };
  const r = await runIntegrationGate({ surfaces: ['addMember', 'postComment'], files, prompts: { postComment: 'P' }, skeleton: SKEL, gate: { kind: 'cheap-judge', repairDepth: 1 }, rebuild: async () => readerArr, judgeInvoke: async () => ({ text: '{"agree":false,"mismatch":"x"}' }) });
  ok('K3: an oracle token in a surface voids the candidate (leak=true)', r.leak === true);
  ok('scanOracleLeak still flags a known oracle token', scanOracleLeak('check SEAM+ here') === true);
}

// ---- 8. HASH-SAFETY — the new node must not perturb any P1/K8 genome hash --------------------------
{
  const base = defaultGenome();                         // P1/K8 genome (no integrationGate field)
  const hBase = genomeHash(base);
  const withOff = cloneGenome(base); withOff.integrationGate = { kind: 'off', repairDepth: 0 };
  ok('adding integrationGate:{off,0} does NOT change the hash (canonical strips it)', genomeHash(withOff) === hBase, `${genomeHash(withOff)} vs ${hBase}`);
  ok('defaultGenome (no field) is valid', validateGenome(base).ok);
  ok('genome WITH off-gate is valid', validateGenome(withOff).ok);
  const on = cloneGenome(base); on.integrationGate = { kind: 'deterministic', repairDepth: 1 };
  ok('genome WITH on-gate is valid', validateGenome(on).ok);
  ok('a gate-ON genome DOES get a distinct hash (it is a distinct candidate)', genomeHash(on) !== hBase);
  const bad = cloneGenome(base); bad.integrationGate = { kind: 'off', repairDepth: 2 };
  ok('off-form constraint enforced (off ⇒ repairDepth 0)', validateGenome(bad).ok === false);
  const badKind = cloneGenome(base); badKind.integrationGate = { kind: 'nonsense', repairDepth: 0 };
  ok('off-domain kind rejected', validateGenome(badKind).ok === false);
}

const pass = checks.every((c) => c.pass);
for (const c of checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`);
console.log(`\n${pass ? 'OK' : 'FAIL'} — P2a integration-gate smoke (${checks.filter((c) => c.pass).length}/${checks.length})`);

if (import.meta.url === url.pathToFileURL(process.argv[1] || '').href) process.exit(pass ? 0 : 1);
export { run };
function run() { return { name: 'P2a integration-gate smoke', pass, checks }; }
