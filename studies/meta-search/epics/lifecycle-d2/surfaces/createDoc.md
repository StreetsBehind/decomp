Implement filing a doc.

  export function createDoc(ctx, input) { ... }

- `input` is `{ title }`. Create a new doc record, add it to `ctx.db.docs` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
