Implement reading a publicly-visible doc.

  export function getPublic(ctx, docId) { ... }

- Return the doc record. Throw if the doc does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
