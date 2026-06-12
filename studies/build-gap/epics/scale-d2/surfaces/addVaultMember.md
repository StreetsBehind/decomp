Implement adding a member to a vault.

Write an ES module that exports a function:

  export function addVaultMember(ctx, vaultId, userId, role) { ... }

- Record that the user `userId` is a member of the vault `vaultId`, with the given `role`
  (`'member'` or `'admin'`).
- Return the created membership.
- If the vault or the user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
