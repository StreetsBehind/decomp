Implement filing a ticket.

  export function createTicket(ctx, input) { ... }

- `input` is `{ title }`. Create a new ticket record, add it to `ctx.db.tickets` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
