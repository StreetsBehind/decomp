// Read runs/<runId>/trials.jsonl, compute per-(model,N) pass-rate + Wilson 95% lower bound, locate
// each model's break-point (first N where reliable task-pass falls below θ). All aggregates re-derive
// from the raw trials — nothing here is a primary record.
//
// Usage: node analyze.mjs <runId> [theta=0.9]
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const runId = process.argv[2];
const THETA = Number(process.argv[3] || 0.9);
if (!runId) { console.error("usage: node analyze.mjs <runId> [theta]"); process.exit(1); }

const dir = path.join(HERE, "runs", runId);
const trials = fs.readFileSync(path.join(dir, "trials.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

function wilsonLower(k, n, z = 1.96) {
  if (n === 0) return 0;
  const p = k / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, (c - m) / d);
}

const APPARATUS = new Set(["transport_error", "harness_error"]); // not the model's fault → excluded from capability denom
const models = [...new Set(trials.map((t) => t.model))];
const sizes = [...new Set(trials.map((t) => t.N))].sort((a, b) => a - b);

console.log(`\n=== ${runId} — naked one-shot CAPACITY (task-pass = ALL N units correct) ===`);
console.log(`CAPABILITY rate = passes / (trials − apparatus errors). θ(point) = ${THETA}\n`);
const header = "model".padEnd(18) + sizes.map((N) => ("N=" + N).padStart(12)).join("");
console.log(header);
console.log("-".repeat(header.length));

const breakpoints = {};
for (const m of models) {
  let row = m.padEnd(18);
  let firstCrack = null;
  for (const N of sizes) {
    const cell = trials.filter((t) => t.model === m && t.N === N);
    const appa = cell.filter((t) => APPARATUS.has(t.failureClass)).length;
    const valid = cell.length - appa;
    const k = cell.filter((t) => t.taskPass).length;
    const rate = valid ? k / valid : 0;
    if (firstCrack === null && valid && rate < THETA) firstCrack = N;
    row += `${(rate * 100).toFixed(0)}%(${k}/${valid})`.padStart(12);
  }
  breakpoints[m] = firstCrack;
  console.log(row);
}

console.log("\n--- break-point (first N with capability point-estimate < θ; reps too few for a Wilson-lower≥θ claim) ---");
for (const m of models) {
  const bp = breakpoints[m];
  console.log(`  ${m.padEnd(18)} ${bp === null ? `> ${sizes[sizes.length - 1]} (no crack in tested range)` : `first dip at N=${bp}`}`);
}

console.log("\n--- apparatus errors (excluded above; harness/transport, NOT capability) ---");
for (const m of models) {
  const appa = trials.filter((t) => t.model === m && APPARATUS.has(t.failureClass)).length;
  console.log(`  ${m.padEnd(18)} ${appa}/${trials.filter((t) => t.model === m).length}`);
}

// Mean unit-pass fraction (degradation shape) + failure-mode mix
console.log("\n--- mean unit-pass fraction (graceful taper vs cliff) ---");
console.log("model".padEnd(18) + sizes.map((N) => ("N=" + N).padStart(9)).join(""));
for (const m of models) {
  let row = m.padEnd(18);
  for (const N of sizes) {
    const cell = trials.filter((t) => t.model === m && t.N === N);
    const f = cell.length ? cell.reduce((a, t) => a + (t.unitPassFraction || 0), 0) / cell.length : 0;
    row += (f).toFixed(2).padStart(9);
  }
  console.log(row);
}

console.log("\n--- failure-class mix (non-pass trials) ---");
for (const m of models) {
  const bad = trials.filter((t) => t.model === m && !t.taskPass);
  const mix = {};
  for (const t of bad) mix[t.failureClass] = (mix[t.failureClass] || 0) + 1;
  console.log(`  ${m.padEnd(18)} ${Object.keys(mix).length ? Object.entries(mix).map(([k, v]) => `${k}:${v}`).join(" ") : "(none)"}`);
}

// Gateway resolved-upstream distribution (the pool is adaptive; bucket post-hoc)
const gw = trials.filter((t) => t.transport === "gateway");
if (gw.length) {
  console.log("\n--- gateway resolved-upstream pass-rate (adaptive pool, small-n per upstream) ---");
  const byUp = {};
  for (const t of gw) {
    const u = t.resolvedModel || "(err)";
    byUp[u] = byUp[u] || { n: 0, pass: 0 };
    byUp[u].n++; if (t.taskPass) byUp[u].pass++;
  }
  for (const [u, s] of Object.entries(byUp).sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${u.padEnd(48)} ${s.pass}/${s.n}`);
  }
}
