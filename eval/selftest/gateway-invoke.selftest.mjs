// Pins the jnoccio gateway invoke (runner/model-client.mjs makeGatewayInvoke) — specifically the
// VALIDITY guards that make every routed builder see IDENTICAL instructions + mechanical constraints
// (the concern that motivated wiring it): temperature 0, max_tokens <= 8192 (so the gateway's
// per-model output clamp never fires), exactly [system,user] messages, no model-specific fields
// injected. Also pins the response parsing that records the RESOLVED upstream model + route (A8
// reproducibility) and usd 0. Deterministic, zero network — fetch is injected.

import assert from 'node:assert/strict';
import { makeGatewayInvoke } from '../../runner/model-client.mjs';

// A stub fetch that captures the outgoing request and returns a canned jnoccio response that mirrors
// the REAL shape (resolved upstream in `model`, provenance under `jnoccio`, usage block).
function makeCapturingFetch(captured, { ok = true, status = 200 } = {}) {
  return async (url, init) => {
    captured.url = url;
    captured.init = init;
    captured.headers = init.headers;
    captured.method = init.method;
    captured.body = JSON.parse(init.body);
    const canned = {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1781220523,
      model: 'accounts/fireworks/models/glm-5p1', // RESOLVED upstream (NOT the visible alias)
      choices: [
        { index: 0, message: { role: 'assistant', content: '```json\n{"beads":[]}\n```' }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 42, total_tokens: 52 },
      jnoccio: { winner_model_id: 'fireworks/fireworks-glm-51', primary_model_id: 'fireworks/fireworks-glm-51', request_id: 'req-123' },
    };
    return { ok, status, text: async () => JSON.stringify(canned) };
  };
}

async function run() {
  let n = 0;
  const A = (cond, msg) => { assert.ok(cond, msg); n++; };
  const E = (a, b, msg) => { assert.equal(a, b, msg); n++; };

  // --- the request is built with the uniformity guards -----------------------
  const cap = {};
  const invoke = makeGatewayInvoke({ baseURL: 'http://127.0.0.1:4317/v1', apiKey: 'test-key', fetch: makeCapturingFetch(cap) });
  const res = await invoke({ prompt: 'PROMPT', system: 'CUSTOM SYS' });

  A(cap.url.endsWith('/chat/completions'), 'POSTs to /chat/completions');
  A(cap.url.startsWith('http://127.0.0.1:4317/v1'), 'uses the configured baseURL');
  E(cap.method, 'POST', 'method is POST');
  E(cap.headers.Authorization, 'Bearer test-key', 'bearer auth from apiKey');
  E(cap.headers['Content-Type'], 'application/json', 'json content type');
  E(cap.body.model, 'jnoccio/jnoccio-fusion', 'visible gateway model id is sent');
  E(cap.body.temperature, 0, 'UNIFORMITY: temperature pinned to 0');
  E(cap.body.max_tokens, 16384, 'UNIFORMITY: max_tokens pinned to the min-roster cap (clamp no-op)');
  E(cap.body.stream, false, 'non-streaming single shot');
  // no model-specific / injected fields: the body is exactly these keys.
  assert.deepEqual(Object.keys(cap.body).sort(), ['max_tokens', 'messages', 'model', 'stream', 'temperature'], 'NO extra/model-specific fields in the body'); n++;
  E(cap.body.messages.length, 2, 'exactly system + user — no injected messages');
  E(cap.body.messages[0].role, 'system', 'first message is system');
  E(cap.body.messages[0].content, 'CUSTOM SYS', 'caller system forwarded verbatim');
  E(cap.body.messages[1].role, 'user', 'second message is user');
  E(cap.body.messages[1].content, 'PROMPT', 'caller prompt forwarded verbatim');

  // --- the response is parsed to the contract + records the resolved upstream ---
  E(res.text, '{"beads":[]}', 'content returned with markdown fences stripped');
  E(res.outputTokens, 42, 'outputTokens = usage.completion_tokens');
  E(res.usd, 0, 'free tier -> usd 0');
  A(Number.isFinite(res.wallClockSec) && res.wallClockSec >= 0, 'wallClockSec measured');
  E(res.model, 'accounts/fireworks/models/glm-5p1', 'records the RESOLVED upstream, not the alias');
  E(res.route, 'fireworks/fireworks-glm-51', 'records jnoccio.winner_model_id');
  E(res.requestId, 'req-123', 'records jnoccio.request_id for ledger reproducibility');
  E(res.finishReason, 'stop', 'records finish_reason');

  // --- the clamp is enforced on OUR side: asking for more still sends 8192 ----
  const cap2 = {};
  const invoke2 = makeGatewayInvoke({ apiKey: 'k', maxTokens: 32000, fetch: makeCapturingFetch(cap2) });
  await invoke2({ prompt: 'P' });
  E(cap2.body.max_tokens, 16384, 'requesting > cap is clamped to 16384 on our side (uniform budget)');

  // --- a default system prompt is used when none is passed -------------------
  const cap3 = {};
  const invoke3 = makeGatewayInvoke({ apiKey: 'k', fetch: makeCapturingFetch(cap3) });
  await invoke3({ prompt: 'P' });
  A(/Output ONLY the requested JSON/.test(cap3.body.messages[0].content), 'falls back to the JSON-only system prompt');

  // --- failure modes ---------------------------------------------------------
  const invokeErr = makeGatewayInvoke({ apiKey: 'k', fetch: makeCapturingFetch({}, { ok: false, status: 500 }) });
  await assert.rejects(() => invokeErr({ prompt: 'P' }), /HTTP 500/, 'non-2xx rejects with the status'); n++;
  await assert.rejects(() => invoke({ prompt: '' }), /prompt/, 'empty prompt rejects'); n++;

  return { name: 'gateway-invoke', assertions: n };
}

export default run;
