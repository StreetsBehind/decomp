Implement executing a expense.

  export function payExpense(ctx, expenseId) { ... }

- Carry it out: append an execution-audit record (authored by the caller) to `ctx.db.expenseLog` and return it. Throw if the expense does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
