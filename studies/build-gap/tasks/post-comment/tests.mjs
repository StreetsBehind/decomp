// Test oracle for the post-comment task. HAPPY = post a valid comment, authored by the caller.
// OBLIGATION = input validation the vague spec never mentioned: reject empty/whitespace bodies and
// absurdly long bodies (a naive impl inserts anything). The model is NOT shown the obligation tests.
import assert from 'node:assert/strict';

const caller = { userId: 'u-alice', orgId: 'org-1', role: 'member' };
const ctx = () => ({ session: { ...caller }, db: { comments: [] } });

export const happy = [
  {
    name: 'posts a comment with the given body',
    run: (mod) => {
      const c = ctx();
      const r = mod.postComment(c, 'hello world');
      assert.equal(c.db.comments.length, 1, 'one comment inserted');
      assert.equal(c.db.comments[0].body, 'hello world', 'body stored');
      assert.equal(r.body, 'hello world', 'created comment returned');
    },
  },
  {
    name: 'the comment is authored by the caller',
    run: (mod) => {
      const c = ctx();
      const r = mod.postComment(c, 'mine');
      assert.equal(r.authorId, 'u-alice', 'authorId = caller');
      assert.equal(r.orgId, 'org-1', 'orgId = caller org');
    },
  },
];

export const obligation = [
  {
    name: 'VALIDATION: rejects an empty / whitespace-only body',
    run: (mod) => {
      for (const bad of ['', '   ', '\n\t']) {
        const c = ctx();
        let threw = false;
        try { mod.postComment(c, bad); } catch { threw = true; }
        assert.equal(c.db.comments.length, 0, `empty body ${JSON.stringify(bad)} must not be inserted`);
        assert.ok(threw, `empty body ${JSON.stringify(bad)} should be rejected (throw)`);
      }
    },
  },
  {
    name: 'VALIDATION: rejects an oversized body (> 1000 chars)',
    run: (mod) => {
      const c = ctx();
      let threw = false;
      try { mod.postComment(c, 'x'.repeat(5000)); } catch { threw = true; }
      assert.equal(c.db.comments.length, 0, 'oversized body must not be inserted');
      assert.ok(threw, 'oversized body should be rejected (throw)');
    },
  },
];
