// The BEST-OF-N repair selector + no-regress guard (COEVOLUTION-SPEC §4 "(B) best-of-N repair gene"; the
// model-agnostic launderer of repair-route variance).
//
// WHY (two findings from the obligation-lever causality probes, OBLIGATION-CONTRACT.md):
//   1. A model route-back repair is a SINGLE gateway draw. Grading it once smuggles single-draw route-luck into
//      a worst-of-K fitness — the exact thing the model-agnostic principle forbids (memory:
//      model-agnostic-and-failure-attribution). Best-of-N draws N route-backs and SELECTS among them.
//   2. A repair that fixes the targeted defect can REGRESS another axis (the obligation gate's repair fixed a
//      missing crosscut obligation but broke a passing integration seam — approval draw1 i100→50). Putting the
//      ORIGINAL code in the candidate pool as the no-regress FLOOR means a repair is accepted ONLY if it
//      strictly out-scores the original on an oracle-blind quality score — so a strictly-worse repair is never
//      shipped, and best-of-N hunts for a candidate that fixes the defect WITHOUT the regression.
//
// MODEL-AGNOSTIC + ADMISSIBLE: the candidates are the cheap pool's OWN outputs (N independent route-backs over
// the same fixed `fusion` pool), never a privileged model — selecting among the pool's own draws is NOT
// route-selection (the inadmissible fix), it is output-QA over a non-stationary pool. ORACLE-BLIND: the `score`
// function is INJECTED by the caller (this module imports nothing domain-specific), and the caller is
// responsible for keeping it oracle-blind (the obligation gate scores with `verifySurface` + structural checks,
// all public). This module never sees the oracle.

/**
 * Is `code` a structurally plausible module for `surface`? A cheap ($0, no spawn) string gate that disqualifies
 * empty / truncated / non-module outputs (a verbose reasoning blob, an apology) so they cannot win selection.
 * It is deliberately LENIENT (a real `isValidSurface` spawn is the authoritative check elsewhere) — its only
 * job is to floor out garbage candidates in the best-of-N race.
 */
export function structurallyPlausible(code, surface) {
  const c = (code || '').trim();
  if (c.length < 20) return false;
  const exportsSomething = /export\s+(default\s+)?(async\s+)?function\b/.test(c)
    || /export\s+(const|let|var)\s/.test(c) || /export\s*\{/.test(c) || /module\.exports/.test(c);
  if (!exportsSomething) return false;
  // names the requested surface (loose — the function or a reference to it appears).
  return c.includes(surface) || new RegExp(`function\\s+${surface}\\b`).test(c);
}

/**
 * Select the best of N route-back repairs, with the ORIGINAL as the no-regress floor.
 * @param {object} p
 * @param {string} p.surface
 * @param {string} p.originalCode    the pre-repair code (the no-regress floor — always in the candidate pool)
 * @param {number} p.n               number of route-backs to draw (n=1 → pure no-regress guard)
 * @param {string} p.repairPrompt    the (already leak-scanned) repair prompt, reused for every draw
 * @param {(surface:string, prompt:string)=>Promise<string>} p.rebuild   one route-back (returns code or '')
 * @param {(code:string)=>number} p.score   oracle-blind quality score, higher = better (caller-owned, K3-safe)
 * @returns {Promise<{code, src, score, accepted, validDraws, scores}>}
 *   accepted=false ⇒ no draw beat the original (kept original — no-regress). `src` = 'original' | `draw<i>`.
 */
export async function selectBestRepair({ surface, originalCode, n, repairPrompt, rebuild, score }) {
  const draws = Math.max(1, n | 0);
  let bestCode = originalCode, bestScore = score(originalCode), bestSrc = 'original';
  let accepted = false, validDraws = 0;
  const scores = [{ src: 'original', score: bestScore }];
  for (let i = 0; i < draws; i++) {
    let code; try { code = await rebuild(surface, repairPrompt); } catch { code = ''; }
    if (!code || !code.trim()) { scores.push({ src: `draw${i + 1}`, score: null }); continue; }
    validDraws++;
    const s = score(code);
    scores.push({ src: `draw${i + 1}`, score: s });
    if (s > bestScore) { bestCode = code; bestScore = s; bestSrc = `draw${i + 1}`; accepted = true; }
  }
  return { code: bestCode, src: bestSrc, score: bestScore, accepted, validDraws, scores };
}
