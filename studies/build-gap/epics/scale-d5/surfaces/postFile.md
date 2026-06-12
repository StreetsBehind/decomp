Implement posting a file on a vault.

Write an ES module that exports a function:

  export function postFile(ctx, vaultId, body) { ... }

- Append a new file, authored by the caller, to `ctx.db.files`, and return it.
  A file record has the shape `{ id, vaultId, authorId, orgId, body, createdAt }`.
- Only a member of the vault may post a file on it; otherwise throw an Error.
- If the vault does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
