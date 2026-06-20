Implement executing a request.

  export function executeRequest(ctx, requestId) { ... }

- Carry it out: append an execution-audit record (authored by the caller) to `ctx.db.auditLog` and return it. Throw if the request does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
