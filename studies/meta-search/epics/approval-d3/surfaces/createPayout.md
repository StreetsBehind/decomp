Implement filing a payout.

  export function createPayout(ctx, input) { ... }

- `input` is `{ body }`. Create a new payout record, add it to `ctx.db.payouts` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
