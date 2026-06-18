Implement advancing a doc's state.

  export function advanceDoc(ctx, docId, toState) { ... }

- Move the doc to `toState` and return `{ docId, toState }`. Throw if the doc does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
