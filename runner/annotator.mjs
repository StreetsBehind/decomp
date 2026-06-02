// The live (claude-backed) produces/consumes ANNOTATOR injected into eval/extract-interfaces.mjs.
//
// Mirrors runner/judge.mjs: a factory over the runner's `invoke` that returns one bounded async
// function. extract-interfaces calls it once per bead (a LOCAL question), so the annotator sees ONLY
// that packet — never the whole decomposition. PURE parsing; the only non-determinism is the model.
//
// Vocabulary alignment (§1.1) is nudged in-prompt ("reuse the SAME lowercase-kebab name when two
// packets mean the same resource"); the extractor's normalizer is the deterministic backstop. A
// dictionary-first phase (build the resource dictionary, then reference ids) is the stronger
// refinement — not built here.

export const ANNOTATE_SYSTEM =
  'You analyze ONE build packet in isolation and report only its typed interface. ' +
  'Output ONLY a single JSON object {"produces":[...],"consumes":[...]}. No prose, no fences.';

/** The per-bead annotation prompt. LOCAL: only this packet + the lattice kinds. */
export function renderAnnotatePrompt(bead, lattice) {
  return [
    'For the ONE build packet below, list the typed resources it PRODUCES (creates / exposes / writes)',
    'and the ones it CONSUMES (reads / depends on), using ONLY these resource kinds:',
    `  ${lattice.join(' · ')}`,
    '',
    'Each resource id is "Kind:name". Use a lowercase-kebab name. Reuse the SAME name when two packets',
    'plainly mean the same resource (e.g. always "Store:session", never also "Store:sessions"). Do NOT',
    'list dependencies on other packets — only the resources this packet itself reads and writes.',
    '',
    `PACKET: ${bead.title || bead.id}`,
    bead.acceptanceCriteria && bead.acceptanceCriteria.length ? `ACCEPTANCE CRITERIA:\n${bead.acceptanceCriteria.map((a) => `  - ${a}`).join('\n')}` : '',
    bead.files && bead.files.length ? `FILES: ${bead.files.join(', ')}` : '',
    '',
    'Return: {"produces":["Kind:name", ...], "consumes":["Kind:name", ...]}',
  ].filter(Boolean).join('\n');
}

/** Parse an annotator reply into { produces:string[], consumes:string[] }. Tolerates prose/fences. Never throws. */
export function parseInterface(text) {
  const clean = (typeof text === 'string' ? text : '').replace(/```(?:json)?/gi, ' ').trim();
  let obj = null;
  try {
    obj = JSON.parse(clean);
  } catch {
    const m = clean.match(/\{[\s\S]*\}/); // first balanced-ish object amid prose
    if (m) { try { obj = JSON.parse(m[0]); } catch { obj = null; } }
  }
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  if (!obj || typeof obj !== 'object') return { produces: [], consumes: [] };
  return { produces: arr(obj.produces), consumes: arr(obj.consumes) };
}

/**
 * Build the live annotator. One bounded `claude -p` per bead via the injected invoke.
 * @param {(args:object)=>Promise<{text:string}>} invoke  the runner's claude invoke
 * @param {{ model?: string }} [opts]
 * @returns {(q:{bead:object, lattice:string[]})=>Promise<{produces:string[],consumes:string[]}>}
 */
export function makeClaudeAnnotator(invoke, opts = {}) {
  if (typeof invoke !== 'function') throw new Error('makeClaudeAnnotator: invoke is required');
  return async function annotate({ bead, lattice }) {
    const res = await invoke({
      prompt: renderAnnotatePrompt(bead, lattice),
      system: ANNOTATE_SYSTEM,
      model: opts.model,
      maxTurns: 1,
      role: 'annotate',
      signal: opts.signal,
    });
    return parseInterface(res && typeof res.text === 'string' ? res.text : '');
  };
}

/**
 * A deterministic STUB annotator for tests / zero-spend runs: a table keyed by bead id (or title)
 * -> { produces, consumes }. Beads with no entry get an empty interface.
 * @param {Record<string, {produces?:string[], consumes?:string[]}>} table
 */
export function makeStubAnnotator(table = {}) {
  return async function annotate({ bead }) {
    const e = table[bead.id] || table[bead.title] || {};
    return { produces: e.produces || [], consumes: e.consumes || [] };
  };
}

export default { makeClaudeAnnotator, makeStubAnnotator, parseInterface, renderAnnotatePrompt, ANNOTATE_SYSTEM };
