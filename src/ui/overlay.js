import { h } from './dom.js';
import { REPORT_REASONS } from '../js/store.js';
import { PROVIDERS } from '../js/providers.js';

export function overlayLayer(app, actions) {
  const ov = app.overlay;
  if (!ov) return null;

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) {
      actions.closeOverlay();
    }
  }

  let titleText = 'Notice';
  let bodyNodes = [];
  let buttons = [];

  if (ov.type === 'report') {
    titleText = 'Report this question';
    let chosenReason = ov.reason || 'incorrect';

    const radios = REPORT_REASONS.map(r => {
      const radio = h('input', {
        type: 'radio',
        name: 'report-reason',
        value: r.id,
        id: `reason-${r.id}`,
        checked: r.id === chosenReason,
        onchange: () => { chosenReason = r.id; }
      });
      return h('label', { class: 'radio-label', for: `reason-${r.id}` },
        radio,
        h('span', {}, r.label)
      );
    });

    bodyNodes = [
      h('p', { class: 'ov-desc' }, 'Reported questions are skipped in every future session. You can restore them from History.'),
      h('fieldset', { class: 'ov-fieldset' },
        h('legend', {}, 'What is wrong with it?'),
        ...radios
      )
    ];

    buttons = [
      h('button', { class: 'btn', onclick: () => actions.closeOverlay() }, 'Cancel'),
      h('button', { class: 'btn stop', onclick: () => actions.submitReport(chosenReason) }, 'Report and skip')
    ];
  } else if (ov.type === 'confirm-finish') {
    titleText = 'Submit the exam?';
    const u = ov.unanswered != null ? ov.unanswered : 0;
    const f = ov.flagged != null ? ov.flagged : 0;

    bodyNodes = [
      h('p', { class: 'ov-desc' }, `${u} unanswered and ${f} flagged. Unanswered questions count as incorrect.`)
    ];

    buttons = [
      h('button', { class: 'btn', onclick: () => actions.closeOverlay() }, 'Keep working'),
      h('button', { class: 'btn stop', onclick: () => actions.confirmFinish() }, 'Submit exam')
    ];
  } else if (ov.type === 'confirm-leave') {
    titleText = 'Leave this session?';
    bodyNodes = [
      h('p', { class: 'ov-desc' }, 'Your answers in this session will not be scored or saved to your history.')
    ];

    buttons = [
      h('button', { class: 'btn', onclick: () => actions.closeOverlay() }, 'Stay'),
      h('button', { class: 'btn stop', onclick: () => actions.leaveSession() }, 'Leave session')
    ];
  } else if (ov.type === 'ai-settings') {
    titleText = 'AI Question Generator';
    const form = {
      provider: (app.aiConfig && app.aiConfig.provider) || 'gemini',
      key: (app.aiConfig && app.aiConfig.key) || '',
      model: (app.aiConfig && app.aiConfig.model) || '',
      endpoint: (app.aiConfig && app.aiConfig.endpoint) || '',
    };

    const providerSelect = h('select', {
      id: 'ai-provider-select',
      onchange: (e) => { form.provider = e.target.value; }
    },
      h('option', { value: 'gemini', selected: form.provider === 'gemini' }, `Google Gemini (default ${PROVIDERS.gemini.defaultModel})`),
      h('option', { value: 'openai', selected: form.provider === 'openai' }, `OpenAI / OpenRouter / Compatible (default ${PROVIDERS.openai.defaultModel})`),
      h('option', { value: 'anthropic', selected: form.provider === 'anthropic' }, `Anthropic Claude (default ${PROVIDERS.anthropic.defaultModel})`)
    );

    const keyInput = h('input', {
      type: 'password',
      id: 'ai-key-input',
      value: form.key,
      placeholder: 'Paste API key here',
      oninput: (e) => { form.key = e.target.value; }
    });

    const modelInput = h('input', {
      type: 'text',
      id: 'ai-model-input',
      value: form.model,
      placeholder: 'Default model if left blank',
      oninput: (e) => { form.model = e.target.value; }
    });

    const endpointInput = h('input', {
      type: 'text',
      id: 'ai-endpoint-input',
      value: form.endpoint,
      placeholder: 'e.g. https://openrouter.ai/api/v1/chat/completions',
      oninput: (e) => { form.endpoint = e.target.value; }
    });

    bodyNodes = [
      h('p', { class: 'ov-desc' },
        'Connect an AI API key to write fresh scenario questions on each visit. The key is saved only in this browser and is sent only to the provider you choose (or the custom endpoint you enter), in a request header. Use a key with a spending limit, and clear it here on shared computers.'
      ),
      h('div', { class: 'form-group' },
        h('label', { for: 'ai-provider-select' }, 'Provider'),
        providerSelect
      ),
      h('div', { class: 'form-group' },
        h('label', { for: 'ai-key-input' }, 'API Key'),
        keyInput
      ),
      h('div', { class: 'form-group' },
        h('label', { for: 'ai-model-input' }, 'Model Name (Optional)'),
        modelInput
      ),
      h('div', { class: 'form-group' },
        h('label', { for: 'ai-endpoint-input' }, 'Custom Endpoint (Optional)'),
        endpointInput
      )
    ];

    buttons = [
      h('button', { class: 'btn', onclick: () => actions.closeOverlay() }, 'Cancel'),
      h('button', { class: 'btn stop', onclick: () => actions.saveAiSettings(null) }, 'Clear / Bank only'),
      h('button', { class: 'btn go', onclick: () => actions.saveAiSettings(form) }, 'Save & Connect')
    ];
  } else {
    // Default notice
    titleText = ov.title || 'Notice';
    bodyNodes = [
      h('p', { class: 'ov-desc' }, ov.text || '')
    ];
    buttons = [
      h('button', { class: 'btn go', onclick: () => actions.closeOverlay() }, 'OK')
    ];
  }

  const card = h('div', { class: 'overlay-card' },
    h('h2', { id: 'ov-title' }, titleText),
    h('div', { class: 'overlay-body' }, ...bodyNodes),
    h('div', { class: 'row end' }, ...buttons)
  );

  return h('div', {
    class: 'overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ov-title',
    onclick: onBackdropClick,
  }, card);
}
