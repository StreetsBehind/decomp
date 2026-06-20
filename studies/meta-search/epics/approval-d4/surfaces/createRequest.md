Implement filing a request.

  export function createRequest(ctx, input) { ... }

- `input` is `{ body }`. Create a new request record, add it to `ctx.db.requests` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
