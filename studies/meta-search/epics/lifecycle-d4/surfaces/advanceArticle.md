Implement advancing a article's state.

  export function advanceArticle(ctx, articleId, toState) { ... }

- Move the article to `toState` and return `{ articleId, toState }`. Throw if the article does not exist.
Return ONLY the JavaScript module code. No prose, no markdown.
