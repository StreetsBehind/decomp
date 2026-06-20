Implement executing a release.

  export function shipRelease(ctx, releaseId) { ... }

- Carry it out: append an execution-audit record (authored by the caller) to `ctx.db.shipLog` and return it. Throw if the release does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
