Implement posting a ticket on a tracker.

Write an ES module that exports a function:

  export function postTicket(ctx, trackerId, body) { ... }

- Append a new ticket, authored by the caller, to `ctx.db.tickets`, and return it.
  A ticket record has the shape `{ id, trackerId, authorId, orgId, body, createdAt }`.
- Only a member of the tracker may post a ticket on it; otherwise throw an Error.
- If the tracker does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
