Implement posting a card on a board.

Write an ES module that exports a function:

  export function postCard(ctx, boardId, body) { ... }

- Append a new card, authored by the caller, to `ctx.db.cards`, and return it.
  A card record has the shape `{ id, boardId, authorId, orgId, body, createdAt }`.
- Only a member of the board may post a card on it; otherwise throw an Error.
- If the board does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
