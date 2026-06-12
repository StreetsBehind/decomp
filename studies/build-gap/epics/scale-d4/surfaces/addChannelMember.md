Implement adding a member to a channel.

Write an ES module that exports a function:

  export function addChannelMember(ctx, channelId, userId, role) { ... }

- Record that the user `userId` is a member of the channel `channelId`, with the given `role`
  (`'member'` or `'admin'`).
- Return the created membership.
- If the channel or the user does not exist, throw an Error.

Return ONLY the JavaScript module code. No prose, no markdown.
