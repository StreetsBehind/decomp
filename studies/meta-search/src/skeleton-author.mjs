// Skeleton sourcing for the P1 live arm (DESIGN §2 skeleton-author node + §6 cost term).
//
// P1 is the CHEAPER-AUTHOR × CHECKER arm (FREEZE/A1): the attributed gene is the CHECKER by construction,
// so the skeleton-author tier is a fixed *cost axis*, not the searched reliability lever. We therefore do
// NOT re-author a skeleton on every eval (that would be expensive and would re-introduce authoring variance
// the experiment is not isolating). Instead each (epic, tier) maps to ONE skeleton, authored ONCE and
// reused across the search:
//
//   - the cached MCOH25 skeletons (studies/build-gap/runs/skel-{cheap-1,sonnet,opus}.md) — authored
//     2026-06-16 for the workspace domain, read-only — are the canonical per-tier skeletons. The anchor
//     pair {workspace, scale-d1} is ONE seam-topology (domainsFor(1) === workspace verbatim), so a
//     skeleton authored for workspace applies to scale-d1 unchanged (FREEZE §1).
//   - the authoring COST is the measured MCOH25 anchor (skel-*.meta.json): fusion $0, sonnet $0.092,
//     opus $0.395. It is charged to the candidate's product-cost ledger via the model-priced rate (§2.5)
//     on the recorded outputTokens, so the cost is grounded in a real metered run, not an assumed constant.
//
// The expensive frontier *authoring call itself* is amortized R&D and is NOT re-run per eval; only its
// modeled product cost enters fitness (§6 "search-cost vs product-cost — strictly separate": the authoring
// spend the SEARCH would incur is R&D; the cost a deployed hybrid would pay to author its skeleton is the
// product cost, and that is what the ledger charges).

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const BUILD_GAP = path.resolve(HERE, '..', '..', 'build-gap');
const SKEL_DIR = path.join(BUILD_GAP, 'runs');

// tier (genome.skeletonAuthor.model) -> cached skeleton file + its metered authoring anchor.
// The files are authored for the workspace domain and apply to scale-d1 (identical seam-topology).
const TIER_SOURCE = {
  fusion: { file: 'skel-cheap-1.md', metaModel: 'fusion' }, // cheap gateway author (deepseek), $0
  sonnet: { file: 'skel-sonnet.md', metaModel: 'sonnet' },  // claude-sonnet-4-6, ~$0.092
  opus:   { file: 'skel-opus.md',   metaModel: 'opus' },    // claude-opus-4-8, ~$0.395
};

function readMeta(file) {
  const metaPath = path.join(SKEL_DIR, file.replace(/\.md$/, '') + '.meta.json');
  try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return null; }
}

/**
 * Resolve the skeleton text + the authoring-cost charge for a genome on an epic.
 * @param {object} genome
 * @param {string} epicName  (unused for text — anchor pair shares one domain — kept for provenance/log)
 * @returns {{ text:string, tier:string, outputTokens:number, source:string|null }}
 *   text === '' when shapesIncluded is false (the naive cheap-isolated candidate: no skeleton injected).
 */
export function resolveSkeleton(genome, epicName) {
  const sk = genome.skeletonAuthor || {};
  if (!sk.shapesIncluded) return { text: '', tier: 'none', outputTokens: 0, source: null };

  const tier = TIER_SOURCE[sk.model] ? sk.model : 'fusion';
  const src = TIER_SOURCE[tier];
  let text = '';
  try { text = fs.readFileSync(path.join(SKEL_DIR, src.file), 'utf8'); } catch { text = ''; }

  // The authoring cost is the MCOH25 REAL METERED usd (§2.5: trust a real metered usd over token×rate — the
  // skeletons were authored by a real claudeInvoke run, so its billed cost is the most grounded anchor:
  // fusion $0, sonnet $0.092, opus $0.395). obligationDepth adds a modeled token premium on top so the
  // depth gene still carries a cost gradient (priced via the table for the extra tokens).
  const meta = readMeta(src.file);
  const baseUsd = meta && Number.isFinite(meta.usd) ? meta.usd : 0;
  const baseTokens = meta && Number.isFinite(meta.outputTokens) ? meta.outputTokens : 0;
  const depthPremiumTokens = (sk.obligationDepth || 0) * 250;
  return { text, tier, baseUsd, outputTokens: baseTokens, depthPremiumTokens, source: src.file };
}

/**
 * Charge a candidate's skeleton-authoring cost to its product-cost ledger (model-priced, §2.5).
 * fusion → $0 (free pool); sonnet/opus → tokens × the pinned published rate.
 * @param {object} ledger  ledger.mjs instance
 * @param {{tier:string, outputTokens:number}} resolved  from resolveSkeleton
 */
export function chargeSkeletonAuthor(ledger, resolved) {
  if (!resolved || resolved.tier === 'none') return 0;
  // charge the real metered MCOH25 base cost, plus the depth-premium tokens priced via the pinned table.
  return ledger.charge('skeletonAuthor', { model: resolved.tier, inputTokens: 0, outputTokens: resolved.depthPremiumTokens || 0, usd: null })
    + ledger.charge('skeletonAuthor', { model: resolved.tier, usd: resolved.baseUsd || 0 });
}

export { TIER_SOURCE };
