// Parametrized pure-function unit bank for the naked one-shot capacity kill-test.
//
// Each unit: { name, desc, ref, cases }
//   - name : the EXACT named export the model must produce
//   - desc : the one-line spec the model sees
//   - ref  : the reference implementation (the oracle; the model never sees it)
//   - cases: argument-tuples the grader runs through ref vs the model's output
//
// The model is shown name + desc + 2 worked examples (computed from ref). The grader
// tests ALL cases. Units are deliberately trivial and (near-)equal difficulty so that a
// failure at large N is attributable to SIZE (how many independent things at once), not to
// any single unit being hard. Parametrization (add2..add7, mod2..mod7, ...) yields many
// DISTINCT units from few families and defeats memorized-snippet recall.

function rotateLeft(a, k) {
  if (!a.length) return [];
  const k2 = ((k % a.length) + a.length) % a.length;
  return a.slice(k2).concat(a.slice(0, k2));
}

// Fixed input banks per argument shape (all non-empty; no negatives → no edge ambiguity).
const NUM = [[0], [3], [7], [10], [42], [100]];
const ARR = [[[1, 2, 3, 4, 5]], [[9, 8, 7, 6]], [[5]], [[2, 4, 6, 8, 10]], [[10, 20, 30]], [[3, 1, 2, 4]]];
const STR = [["hello"], ["abc"], ["a"], ["wonder"], ["xy"], ["claude"]];

export const POOL = [];
const U = (name, desc, ref, cases) => POOL.push({ name, desc, ref, cases });

for (const p of [2, 3, 4, 5, 6, 7]) U(`add${p}`, `returns its number argument plus ${p}`, (x) => x + p, NUM);
for (const p of [2, 3, 4, 5, 6])    U(`mul${p}`, `returns its number argument multiplied by ${p}`, (x) => x * p, NUM);
for (const p of [2, 3, 4, 5, 7])    U(`mod${p}`, `returns its number argument modulo ${p} (the remainder after dividing by ${p})`, (x) => x % p, NUM);
for (const p of [2, 3, 4, 5, 6, 7]) U(`isMul${p}`, `returns true if its number argument is an exact multiple of ${p}, else false`, (x) => x % p === 0, NUM);
for (const p of [5, 10, 20, 50])    U(`clampTo${p}`, `clamps its number argument to the range [0, ${p}] (below 0 → 0, above ${p} → ${p})`, (x) => Math.max(0, Math.min(p, x)), NUM);
for (const p of [1, 2, 3])          U(`rotl${p}`, `rotates the array left by ${p} position(s)`, (a) => rotateLeft(a, p), ARR);
for (const p of [2, 3, 4])          U(`take${p}`, `returns the first ${p} elements of the array`, (a) => a.slice(0, p), ARR);
for (const p of [1, 2, 3])          U(`drop${p}`, `returns the array without its first ${p} element(s)`, (a) => a.slice(p), ARR);
for (const p of [1, 2, 3])          U(`last${p}`, `returns the last ${p} element(s) of the array`, (a) => a.slice(-p), ARR);
for (const p of [2, 3, 4])          U(`rep${p}`, `returns the string repeated ${p} times`, (s) => s.repeat(p), STR);
for (const p of [4, 5, 6])          U(`padTo${p}`, `left-pads the string with '0' until it is at least length ${p}`, (s) => s.padStart(p, "0"), STR);
U(`sumDigits`, `returns the sum of the decimal digits of its non-negative integer argument`, (n) => String(n).split("").reduce((a, c) => a + (+c), 0), NUM);
U(`reverseStr`, `returns the string reversed`, (s) => s.split("").reverse().join(""), STR);
U(`strLen`, `returns the length of the string`, (s) => s.length, STR);
U(`titleWord`, `returns the string with its first character upper-cased`, (s) => (s ? s[0].toUpperCase() + s.slice(1) : s), STR);
U(`countVowels`, `returns the count of vowels (a,e,i,o,u, case-insensitive) in the string`, (s) => (s.match(/[aeiou]/gi) || []).length, STR);
U(`sumList`, `returns the sum of the numbers in the array`, (a) => a.reduce((x, y) => x + y, 0), ARR);
U(`maxList`, `returns the largest number in the array`, (a) => Math.max(...a), ARR);
U(`minList`, `returns the smallest number in the array`, (a) => Math.min(...a), ARR);
U(`doubleList`, `returns a new array with every number doubled`, (a) => a.map((x) => x * 2), ARR);
U(`incList`, `returns a new array with every number increased by 1`, (a) => a.map((x) => x + 1), ARR);
U(`evenList`, `returns a new array with only the even numbers, preserving order`, (a) => a.filter((x) => x % 2 === 0), ARR);
U(`oddList`, `returns a new array with only the odd numbers, preserving order`, (a) => a.filter((x) => x % 2 !== 0), ARR);
U(`joinDash`, `joins the array elements into one string separated by '-'`, (a) => a.join("-"), ARR);
U(`lenList`, `returns the number of elements in the array`, (a) => a.length, ARR);

// Deterministic seeded RNG (mulberry32) so a (size, rep) cell draws an identical unit subset
// for EVERY model — a clean paired comparison — while varying across reps.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawUnits(seed, n) {
  if (n > POOL.length) throw new Error(`drawUnits: N=${n} exceeds pool size ${POOL.length}`);
  const rng = mulberry32(seed);
  const idx = POOL.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => POOL[i]);
}

export function buildPrompt(units) {
  const lines = units.map((u, i) => {
    const ex = u.cases
      .slice(0, 2)
      .map((c) => `${u.name}(${c.map((a) => JSON.stringify(a)).join(", ")}) === ${JSON.stringify(u.ref(...c))}`)
      .join("; ");
    return `${i + 1}. ${u.name}: ${u.desc}. Examples: ${ex}`;
  }).join("\n");
  return (
    `Implement the following ${units.length} independent pure functions as a single JavaScript ES module.\n` +
    `Rules: export each function as a NAMED export using the EXACT name shown; no imports, no side effects, no console output. Output ONLY the module code.\n\n` +
    `${lines}\n`
  );
}
