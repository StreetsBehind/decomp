Implement filing a release.

  export function createRelease(ctx, input) { ... }

- `input` is `{ body }`. Create a new release record, add it to `ctx.db.releases` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
