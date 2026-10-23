export const PROVIDERS = {
  gemini: { label: 'Gemini', defaultModel: 'gemini-3.8-flash' },
  anthropic: { label: 'Claude', defaultModel: 'claude-sonnet-5' },
  openai: { label: 'your OpenAI-compatible model', defaultModel: 'gpt-4o-mini' },
};

const MAX_OUTPUT_TOKENS = 16000;

export function providerLabel(config) {
  const p = config && config.provider;
  return (PROVIDERS[p] && PROVIDERS[p].label) || PROVIDERS.gemini.label;
}

export function providerRequest(config, prompt, { stream = false, json = false } = {}) {
  const provider = (config && config.provider) || 'gemini';
  const key = config ? config.key : '';

  if (provider === 'gemini') {
    const base = (config.endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    const model = config.model || PROVIDERS.gemini.defaultModel;
    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const url = `${base}/models/${encodeURIComponent(model)}:${action}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    };
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    return { url, headers, body };
  }

  if (provider === 'anthropic') {
    const url = config.endpoint || 'https://api.anthropic.com/v1/messages';
    const model = config.model || PROVIDERS.anthropic.defaultModel;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    const body = JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      stream: !!stream,
    });
    return { url, headers, body };
  }

  // openai / compatible
  const url = config.endpoint || 'https://api.openai.com/v1/chat/completions';
  const model = config.model || PROVIDERS.openai.defaultModel;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };
  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: !!stream,
  });
  return { url, headers, body };
}

export function httpErrorCode(status) {
  if (status === 401 || status === 403) return 'bad_key';
  if (status === 429) return 'rate_limited';
  return 'upstream_error';
}

function extractStreamDelta(provider, data) {
  if (provider === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  }
  if (provider === 'anthropic') {
    return data.type === 'content_block_delta' && data.delta?.text ? data.delta.text : '';
  }
  // openai
  return data.choices?.[0]?.delta?.content || '';
}

function extractFullText(provider, data) {
  if (provider === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  }
  if (provider === 'anthropic') {
    return data.content?.map(p => p.text).join('') || '';
  }
  // openai
  return data.choices?.[0]?.message?.content || '';
}

export function parseJsonReply(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const first = text.search(/[\[{]/);
  const lastBracket = text.lastIndexOf(']');
  const lastBrace = text.lastIndexOf('}');
  const last = Math.max(lastBracket, lastBrace);

  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {}
  }

  throw { code: 'upstream_error', message: 'The reply was not JSON.' };
}

export function createAiSample(config, fetchImpl = fetch) {
  if (!config || !config.key) return null;
  const provider = config.provider || 'gemini';

  async function sample(prompt, { onText, signal } = {}) {
    const { url, headers, body } = providerRequest(config, prompt, { stream: true });
    let res;
    try {
      res = await fetchImpl(url, { method: 'POST', headers, body, signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw { code: 'cancelled', message: 'Cancelled' };
      }
      throw { code: 'upstream_error', message: err.message || 'Network error' };
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error?.message || errJson.message || errMsg;
      } catch {}
      throw { code: httpErrorCode(res.status), message: errMsg };
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const data = JSON.parse(payload);
            const delta = extractStreamDelta(provider, data);
            if (delta) {
              fullText += delta;
              if (typeof onText === 'function') {
                onText({ text: fullText, delta });
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw { code: 'cancelled', message: 'Cancelled' };
      }
      throw { code: 'upstream_error', message: err.message || 'Stream error' };
    }

    return { text: fullText, truncated: false };
  }

  sample.json = async function(prompt, { signal } = {}) {
    const { url, headers, body } = providerRequest(config, prompt, { stream: false, json: true });
    let res;
    try {
      res = await fetchImpl(url, { method: 'POST', headers, body, signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw { code: 'cancelled', message: 'Cancelled' };
      }
      throw { code: 'upstream_error', message: err.message || 'Network error' };
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error?.message || errJson.message || errMsg;
      } catch {}
      throw { code: httpErrorCode(res.status), message: errMsg };
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw { code: 'upstream_error', message: 'Response was not valid JSON' };
    }

    const text = extractFullText(provider, data);
    return parseJsonReply(text || JSON.stringify(data));
  };

  return sample;
}
