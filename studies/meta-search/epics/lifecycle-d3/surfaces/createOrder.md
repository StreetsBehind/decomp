Implement filing a order.

  export function createOrder(ctx, input) { ... }

- `input` is `{ title }`. Create a new order record, add it to `ctx.db.orders` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
