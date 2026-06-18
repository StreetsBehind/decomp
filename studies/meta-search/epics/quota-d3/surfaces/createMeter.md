Implement creating a meter.

  export function createMeter(ctx, input) { ... }

- `input` is `{ name }`. Create a new meter record, add it to `ctx.db.meters` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
