Implement creating a voucher.

  export function createVoucher(ctx, input) { ... }

- `input` is `{ name }`. Create a new voucher record, add it to `ctx.db.vouchers` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
