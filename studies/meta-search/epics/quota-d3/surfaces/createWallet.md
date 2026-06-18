Implement creating a wallet.

  export function createWallet(ctx, input) { ... }

- `input` is `{ name }`. Create a new wallet record, add it to `ctx.db.wallets` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
