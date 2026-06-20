Implement filing a expense.

  export function createExpense(ctx, input) { ... }

- `input` is `{ body }`. Create a new expense record, add it to `ctx.db.expenses` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
