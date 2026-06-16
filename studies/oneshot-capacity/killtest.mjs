// Naked one-shot capacity — KILL-TEST orchestrator.
//
// Question (reframed after the criterion data turned out saturated): with ZERO harness, at what
// task SIZE (number of independent equal-difficulty pure functions) does each model's happy-path
// output FIRST crack? Frontier (haiku/sonnet/opus) = saturated control; the gateway pool = the
// cheap/local target whose break-point plausibly sits inside the realistic regime.
//
// Naked = single-shot, tools off, fresh context per call, clean cwd (no project CLAUDE.md). Each
// (size, rep) cell draws an IDENTICAL unit subset for every model (paired comparison). Every trial
// records full provenance (seed, unit names, resolved upstream, finish_reason, raw-completion hash)
// to runs/<runId>/trials.jsonl + blobs/, with a manifest.json pinning config + file hashes + commit.
//
// Env: SMOKE=1 (tiny shakeout) | SIZES=2,4,8,16,32 | RUN_ID=...
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import url from "node:url";
import crypto from "node:crypto";
import { spawn, execSync } from "node:child_process";
import { claudeInvoke, makeGatewayInvoke } from "../../runner/model-client.mjs";
import { extractModule } from "../build-gap/lib/sandbox.mjs";
import { POOL, drawUnits, buildPrompt } from "./bank.mjs";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const CHILD = path.join(HERE, "grade-child.mjs");
const SYSTEM = "You output only a single JavaScript ES module. No prose, no explanation, no markdown fences.";

const SMOKE = !!process.env.SMOKE;
const SIZES = (process.env.SIZES || (SMOKE ? "2,8" : "2,4,8,16,32")).split(",").map(Number);
const MODELS = SMOKE
  ? [
      { key: "claude-haiku-4-5", transport: "claude", reps: 2 },
      { key: "gateway", transport: "gateway", reps: 2 },
    ]
  : [
      { key: "claude-haiku-4-5", transport: "claude", reps: 6, concurrency: 1 },
      { key: "claude-sonnet-4-6", transport: "claude", reps: 6, concurrency: 1 },
      { key: "claude-opus-4-8", transport: "claude", reps: 6, concurrency: 1 },
      { key: "gateway", transport: "gateway", reps: 10, concurrency: 4 },
    ];

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const fileHash = (p) => sha(fs.readFileSync(p));
const gitCommit = (() => { try { return execSync("git rev-parse HEAD", { cwd: HERE }).toString().trim(); } catch { return null; } })();

const RUN_ID = process.env.RUN_ID || (SMOKE ? "smoke" : "kt") + "-" + new Date().toISOString().replace(/[:.]/g, "-");
const OUTDIR = path.join(HERE, "runs", RUN_ID);
fs.mkdirSync(path.join(OUTDIR, "blobs"), { recursive: true });
const blob = (s) => { const h = sha(s); fs.writeFileSync(path.join(OUTDIR, "blobs", h + ".txt"), s); return h; };
const trialsPath = path.join(OUTDIR, "trials.jsonl");
const append = (o) => fs.appendFileSync(trialsPath, JSON.stringify(o) + "\n");

fs.writeFileSync(path.join(OUTDIR, "manifest.json"), JSON.stringify({
  runId: RUN_ID, createdAt: new Date().toISOString(), gitCommit, smoke: SMOKE,
  models: MODELS, sizes: SIZES, system: SYSTEM, poolSize: POOL.length,
  hashes: { bank: fileHash(path.join(HERE, "bank.mjs")), child: fileHash(CHILD), orchestrator: fileHash(path.join(HERE, "killtest.mjs")) },
}, null, 2));

const gw = makeGatewayInvoke({ timeoutMs: 120000 });

function grade(code, names, timeoutMs = 15000) {
  const ex = extractModule(code);
  if (!ex || ex.length < 10) return Promise.resolve({ empty: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "osc-"));
  const sol = path.join(dir, "solution.mjs");
  fs.writeFileSync(sol, ex);
  return new Promise((res) => {
    const child = spawn(process.execPath, [CHILD, sol, names.join(",")], { stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, NODE_OPTIONS: "" } });
    let out = "", done = false;
    const fin = (r) => { if (done) return; done = true; clearTimeout(t); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} res(r); };
    const t = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} fin({ timeout: true }); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => { let p = null; try { p = JSON.parse(out.trim()); } catch {} fin(p || { harnessError: "bad child output", raw: out.slice(0, 200) }); });
    child.on("error", (e) => fin({ harnessError: String((e && e.message) || e) }));
  });
}

async function invoke(model, prompt) {
  const maxAttempts = model.transport === "gateway" ? 2 : 1; // gateway re-routes on hard transport error
  let r = null, err = null, attempts = 0;
  for (let a = 1; a <= maxAttempts; a++) {
    attempts = a;
    try {
      r = model.transport === "claude"
        ? await claudeInvoke({ prompt, system: SYSTEM, model: model.key, maxTurns: 1, timeoutMs: 180000 })
        : await gw({ prompt, system: SYSTEM });
      err = null;
      break;
    } catch (e) { err = String((e && e.message) || e).slice(0, 160); r = null; }
  }
  return { r, err, attempts };
}

// Naked-ize the claude CLI subprocess: spawn it from an EMPTY cwd so no project CLAUDE.md is loaded.
const CLEAN = fs.mkdtempSync(path.join(os.tmpdir(), "osc-cwd-"));
process.chdir(CLEAN);

async function runCell(model, N, rep) {
  const seed = N * 1000 + rep;
  const units = drawUnits(seed, N);
  const names = units.map((u) => u.name);
  const prompt = buildPrompt(units);
  const tc = Date.now();
  const { r, err, attempts } = await invoke(model, prompt);
  const text = r ? r.text || "" : "";
  const completionHash = blob(text);
  const g = r ? await grade(text, names) : { transportError: err };
  const results = Array.isArray(g.results) ? g.results : null;
  const present = results ? results.filter((x) => x.present).length : 0;
  const unitsPassed = results ? results.filter((x) => x.passed).length : 0;
  const imported = !!results;
  const taskPass = imported && unitsPassed === N;
  let cls = "ok";
  if (g.transportError) cls = "transport_error";
  else if (g.empty) cls = "unparseable";
  else if (g.importError) cls = "import_error";
  else if (g.timeout || g.harnessError) cls = "harness_error";
  else if (r && r.finishReason === "length") cls = taskPass ? "ok" : "truncated";
  else if (!taskPass) cls = present < N ? "silent_omission" : "wrong_present";
  return {
    runId: RUN_ID, trialId: `${RUN_ID}:${model.key}:N${N}:r${rep}`,
    model: model.key, transport: model.transport,
    resolvedModel: r ? r.model || model.key : null, route: r ? r.route || null : null,
    finishReason: r ? r.finishReason || null : null,
    N, rep, seed, names, attempts,
    transportError: err || null, empty: !!g.empty, importError: g.importError || null,
    timeout: !!g.timeout, harnessError: g.harnessError || null,
    outputTokens: r ? r.outputTokens : 0, usd: r ? r.usd : null, wallSec: r ? r.wallClockSec : null,
    completionHash, unitsTotal: N, present, unitsPassed, unitPassFraction: N ? unitsPassed / N : 0,
    taskPass, failureClass: cls, _secs: ((Date.now() - tc) / 1000).toFixed(1),
  };
}

async function runPool(items, conc, worker) {
  const q = items.slice();
  await Promise.all(Array.from({ length: conc }, async () => { while (q.length) await worker(q.shift()); }));
}

console.log(`[${RUN_ID}] sizes=${SIZES.join(",")} models=${MODELS.map((m) => m.key).join(",")} pool=${POOL.length}`);
const t0 = Date.now();
let n = 0;
for (const model of MODELS) {
  const cells = [];
  for (const N of SIZES) for (let rep = 0; rep < model.reps; rep++) cells.push({ N, rep });
  await runPool(cells, model.concurrency || 1, async (cell) => {
    const trial = await runCell(model, cell.N, cell.rep);
    append(trial);
    n++;
    console.log(`  ${String(n).padStart(3)} ${model.key.padEnd(18)} N=${String(trial.N).padStart(2)} r${trial.rep} ${trial.taskPass ? "PASS" : "FAIL"} ${String(trial.unitsPassed)}/${trial.N} ${trial.failureClass.padEnd(15)} ${trial._secs}s${model.transport === "gateway" ? "  <- " + (trial.resolvedModel || "(err)") : ""}`);
  });
}
console.log(`\n[${RUN_ID}] done — ${n} trials in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${trialsPath}`);
