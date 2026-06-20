Implement advancing a ticket's state.

  export function advanceTicket(ctx, ticketId, toState) { ... }

- Move the ticket to `toState` and return `{ ticketId, toState }`. Throw if the ticket does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
