// Child process for the epic cohesion oracle. Reads a descriptor JSON ({ mode, files, testsPath }),
// assembles the surface functions into one `api` object, and runs the test buckets against it. Runs in
// its OWN process so generated code that throws at import / hangs / exits can't take the parent down.
//
// WIREABILITY INTEGRITY: a surface that failed to build is wired to a STUB that sets a global sentinel
// and throws. After each test we check the sentinel: if a test "passed" only because an unwired stub
// threw inside an assert.throws (which would spuriously credit e.g. an authz guard to a surface that was
// never built), we OVERRIDE it to a failure. A missing surface is a cohesion failure, never free credit.
//
// argv: <descriptorPath>
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const descriptorPath = process.argv[2];

function makeStub(name) {
  return (...args) => { globalThis.__UNWIRED_HIT = name; throw new Error(`unwired:${name}`); };
}

async function loadApi(desc, EXPECTS) {
  const api = {};
  const wired = {};
  let importErr = null;
  if (desc.mode === 'whole') {
    let mod = null;
    try { mod = await import(pathToFileURL(desc.files.__whole__).href); }
    catch (e) { importErr = String((e && e.message) || e); }
    for (const n of EXPECTS) {
      const fn = mod && typeof mod[n] === 'function' ? mod[n] : null;
      wired[n] = !!fn;
      api[n] = fn || makeStub(n);
    }
    return { api, wired, importErr };
  }
  // isolated: one module per surface, each imported independently (so one bad chunk doesn't sink the rest)
  for (const n of EXPECTS) {
    let fn = null;
    const fpath = desc.files[n];
    if (fpath) {
      try { const mod = await import(pathToFileURL(fpath).href); if (typeof mod[n] === 'function') fn = mod[n]; }
      catch { /* unwired */ }
    }
    wired[n] = !!fn;
    api[n] = fn || makeStub(n);
  }
  return { api, wired, importErr };
}

function runBucket(items, api) {
  const fails = [];
  let pass = 0;
  for (const t of items) {
    globalThis.__UNWIRED_HIT = null;
    let ok = true;
    let why = null;
    try { t.run(api); } catch (e) { ok = false; why = String((e && e.message) || e).slice(0, 200); }
    if (globalThis.__UNWIRED_HIT) { ok = false; why = `touched-unwired:${globalThis.__UNWIRED_HIT}`; }
    if (ok) pass++; else fails.push({ name: t.name, why });
  }
  return { pass, total: items.length, fails };
}

async function main() {
  const desc = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
  const tests = await import(pathToFileURL(desc.testsPath).href);
  const EXPECTS = Array.isArray(tests.EXPECTS) ? tests.EXPECTS : [];
  const { api, wired, importErr } = await loadApi(desc, EXPECTS);
  const wireCount = EXPECTS.filter((n) => wired[n]).length;
  return {
    wire: { pass: wireCount, total: EXPECTS.length, wired },
    happy: runBucket(Array.isArray(tests.happy) ? tests.happy : [], api),
    crosscut: runBucket(Array.isArray(tests.crosscut) ? tests.crosscut : [], api),
    integration: runBucket(Array.isArray(tests.integration) ? tests.integration : [], api),
    importErr,
  };
}

main()
  .then((r) => { process.stdout.write(JSON.stringify(r)); })
  .catch((e) => { process.stdout.write(JSON.stringify({ harnessError: String((e && e.message) || e) })); });
