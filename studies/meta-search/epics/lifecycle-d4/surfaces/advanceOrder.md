Implement advancing a order's state.

  export function advanceOrder(ctx, orderId, toState) { ... }

- Move the order to `toState` and return `{ orderId, toState }`. Throw if the order does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
