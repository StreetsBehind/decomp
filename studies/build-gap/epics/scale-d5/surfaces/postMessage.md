Implement posting a message on a channel.

Write an ES module that exports a function:

  export function postMessage(ctx, channelId, body) { ... }

- Append a new message, authored by the caller, to `ctx.db.messages`, and return it.
  A message record has the shape `{ id, channelId, authorId, orgId, body, createdAt }`.
- Only a member of the channel may post a message on it; otherwise throw an Error.
- If the channel does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
