Implement executing a payout.

  export function settlePayout(ctx, payoutId) { ... }

- Carry it out: append an execution-audit record (authored by the caller) to `ctx.db.settleLog` and return it. Throw if the payout does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
