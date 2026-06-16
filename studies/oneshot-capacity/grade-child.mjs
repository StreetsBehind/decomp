// Isolated child grader: import the model's solution module + the unit bank, run each requested
// unit's cases (solution output vs the bank's reference oracle), print a JSON verdict to stdout.
// Runs in its OWN process (parent spawns with a hard timeout) so a solution that throws on import,
// hangs, or calls process.exit cannot take the sweep down.
//
// argv: <solutionPath> <comma-separated unit names>
import { pathToFileURL } from "node:url";
import { POOL } from "./bank.mjs";

const byName = new Map(POOL.map((u) => [u.name, u]));
const [, , solutionPath, namesCsv] = process.argv;
const names = (namesCsv || "").split(",").filter(Boolean);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (x) => (Array.isArray(x) ? x.slice() : x);

async function main() {
  let mod;
  try {
    mod = await import(pathToFileURL(solutionPath).href);
  } catch (e) {
    return { importError: String((e && e.message) || e).slice(0, 300) };
  }
  const results = [];
  for (const name of names) {
    const u = byName.get(name);
    if (!u) { results.push({ name, present: false, pass: 0, total: 0, passed: false, fails: ["unknown unit"] }); continue; }
    const fn = mod[name];
    const present = typeof fn === "function";
    let pass = 0;
    const fails = [];
    if (present) {
      for (const c of u.cases) {
        try {
          const got = fn(...c.map(clone));
          if (eq(got, u.ref(...c))) pass++;
          else fails.push(`${name}(${c.map((a) => JSON.stringify(a)).join(",")})→${JSON.stringify(got)}≠${JSON.stringify(u.ref(...c))}`);
        } catch (e) {
          fails.push(`${name} threw: ${String((e && e.message) || e).slice(0, 60)}`);
        }
      }
    }
    results.push({ name, present, pass, total: u.cases.length, passed: present && pass === u.cases.length, fails: fails.slice(0, 2) });
  }
  return { results };
}

main()
  .then((r) => process.stdout.write(JSON.stringify(r)))
  .catch((e) => process.stdout.write(JSON.stringify({ harnessError: String((e && e.message) || e) })));
