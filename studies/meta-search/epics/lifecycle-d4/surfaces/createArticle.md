Implement filing a article.

  export function createArticle(ctx, input) { ... }

- `input` is `{ title }`. Create a new article record, add it to `ctx.db.articles` keyed by a new unique id, and return it.
Return ONLY the JavaScript module code. No prose, no markdown.
