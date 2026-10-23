import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVIDERS,
  providerLabel,
  providerRequest,
  httpErrorCode,
  parseJsonReply,
  createAiSample,
} from '../src/js/providers.js';

test('createAiSample returns null without a key', () => {
  assert.equal(createAiSample(null), null);
  assert.equal(createAiSample({}), null);
  assert.equal(createAiSample({ key: '' }), null);
  assert.notEqual(createAiSample({ key: 'secret' }), null);
});

test('the API key travels in a header and never in the URL for all providers', () => {
  const secretKey = 'test-secret-key-12345';

  for (const provider of ['gemini', 'anthropic', 'openai']) {
    const config = { provider, key: secretKey };
    const req = providerRequest(config, 'Hello', { stream: true });

    assert.ok(!req.url.includes(secretKey), `Provider ${provider} URL must not contain the API key: ${req.url}`);

    if (provider === 'gemini') {
      assert.equal(req.headers['x-goog-api-key'], secretKey);
    } else if (provider === 'anthropic') {
      assert.equal(req.headers['x-api-key'], secretKey);
    } else if (provider === 'openai') {
      assert.equal(req.headers['Authorization'], `Bearer ${secretKey}`);
    }
  }
});

test('HTTP status codes map to error codes properly', () => {
  assert.equal(httpErrorCode(401), 'bad_key');
  assert.equal(httpErrorCode(403), 'bad_key');
  assert.equal(httpErrorCode(429), 'rate_limited');
  assert.equal(httpErrorCode(500), 'upstream_error');
  assert.equal(httpErrorCode(502), 'upstream_error');
});

test('parseJsonReply parses direct JSON and JSON wrapped in code fences', () => {
  const direct = '{"a": 1, "b": [2, 3]}';
  assert.deepEqual(parseJsonReply(direct), { a: 1, b: [2, 3] });

  const fenced = '```json\n[{"n": 1, "answer": ["A"], "confident": true, "issue": null}]\n```';
  assert.deepEqual(parseJsonReply(fenced), [{ n: 1, answer: ['A'], confident: true, issue: null }]);

  const conversational = 'Here is the response:\n{"result": "ok"}\nHope this helps!';
  assert.deepEqual(parseJsonReply(conversational), { result: 'ok' });

  assert.throws(() => parseJsonReply('Not json at all'), (err) => err.code === 'upstream_error');
});

test('streamed text is assembled per provider via onText', async () => {
  function makeSseResponse(chunks) {
    const encoder = new TextEncoder();
    let idx = 0;
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      body: {
        getReader() {
          return {
            async read() {
              if (idx >= chunks.length) {
                return { done: true, value: undefined };
              }
              const val = encoder.encode(chunks[idx++]);
              return { done: false, value: val };
            }
          };
        }
      }
    };
  }

  // Test Gemini SSE streaming
  const geminiChunks = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\n',
    'data: {"candidates":[{"content":{"parts":[{"text":"world!"}]}}]}\n\n',
  ];
  const fakeGeminiFetch = () => Promise.resolve(makeSseResponse(geminiChunks));
  const geminiSample = createAiSample({ provider: 'gemini', key: 'k' }, fakeGeminiFetch);

  const deltas = [];
  const res = await geminiSample('test', {
    onText: ({ delta }) => deltas.push(delta)
  });
  assert.equal(res.text, 'Hello world!');
  assert.deepEqual(deltas, ['Hello ', 'world!']);

  // Test Anthropic SSE streaming
  const anthropicChunks = [
    'data: {"type":"content_block_delta","delta":{"text":"Hi "}}\n\n',
    'data: {"type":"content_block_delta","delta":{"text":"Claude"}}\n\n',
  ];
  const fakeAnthropicFetch = () => Promise.resolve(makeSseResponse(anthropicChunks));
  const anthropicSample = createAiSample({ provider: 'anthropic', key: 'k' }, fakeAnthropicFetch);

  const anthropicDeltas = [];
  const anthropicRes = await anthropicSample('test', {
    onText: ({ delta }) => anthropicDeltas.push(delta)
  });
  assert.equal(anthropicRes.text, 'Hi Claude');
  assert.deepEqual(anthropicDeltas, ['Hi ', 'Claude']);
});
