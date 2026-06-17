// Model-priced escalation cost ledger (DESIGN §2.5 / §6 cost term).
//
// The cheap gateway hardcodes usd:0 (runner/model-client.mjs ~L444) — that is the thesis (cheap coding
// is ~free, a Phase-1 upper-bound proxy for owned-hardware amortized cost). But every NON-cheap call
// (a frontier skeleton-author, a future escalation) must be charged so a candidate cannot hide cost by
// escalating to opus "for free". This ledger keys each call on its node's model gene and charges
// tokens × the PINNED published per-token rate (config.PRICE_TABLE).
//
// The all-opus CI guard (§6, finding A2) then tests a GROUNDED price table, not the ledger's own
// constants: an all-opus genome must be strictly cost-dominated by a cheap one.

import { PRICE_TABLE, priceKeyFor } from './config.mjs';

// usd for one call: input/output token counts at the pinned rate for the call's model.
export function priceCall({ model, inputTokens = 0, outputTokens = 0 }) {
  const key = priceKeyFor(model);
  const rate = PRICE_TABLE[key] || PRICE_TABLE.fusion;
  return (inputTokens / 1e6) * rate.in + (outputTokens / 1e6) * rate.out;
}

// A fresh ledger. Each push records one metered call; total() sums usd; byNode() groups for the scorecard.
export function makeLedger() {
  const calls = [];
  return {
    charge(node, { model, inputTokens = 0, outputTokens = 0, usd = null } = {}) {
      // If the transport already metered a real usd (claudeInvoke), trust it; else price from tokens.
      const cost = (usd != null && Number.isFinite(usd)) ? usd : priceCall({ model, inputTokens, outputTokens });
      calls.push({ node, model: priceKeyFor(model), inputTokens, outputTokens, usd: cost });
      return cost;
    },
    calls() { return calls.slice(); },
    total() { return calls.reduce((s, c) => s + (c.usd || 0), 0); },
    byNode() {
      const out = {};
      for (const c of calls) out[c.node] = (out[c.node] || 0) + (c.usd || 0);
      return out;
    },
    byModel() {
      const out = {};
      for (const c of calls) out[c.model] = (out[c.model] || 0) + (c.usd || 0);
      return out;
    },
    snapshot() { return { calls: calls.slice(), total: this.total() }; },
  };
}

// §6 CI guard: an all-opus-escalation genome must be strictly cost-dominated against the grounded table.
// Returns { ok, opusCost, cheapCost }. Used by the ledger self-test (gates).
export function allOpusIsCostDominated({ inputTokens = 2000, outputTokens = 1500 } = {}) {
  const opusCost = priceCall({ model: 'opus', inputTokens, outputTokens });
  const cheapCost = priceCall({ model: 'fusion', inputTokens, outputTokens });
  return { ok: opusCost > cheapCost, opusCost, cheapCost };
}
