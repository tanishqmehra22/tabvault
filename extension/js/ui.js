// Shared DOM helpers. User-supplied text only ever reaches the DOM via textContent.
const ICONS = {
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>', plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  open: '<path d="M14 3h7v7M21 3l-9 9M18 14v6H4V6h6"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', move: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13h6m-3-3 3 3-3 3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="m5 12 5 5 9-10"/>', restore: '<path d="M4 4v6h6M4 10a8 8 0 1 1 2 6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  save: '<path d="M5 3h12l4 4v14H5zM8 3v6h8M8 21v-7h8v7"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
};
export function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}
export function h(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'text') node.textContent = v;
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return node;
}
export const $ = (selector, root = document) => root.querySelector(selector);
export const btn = (label, iconName, props = {}) => h('button', {type: 'button', ...props, class: `btn ${props.class || ''}`.trim()}, iconName && icon(iconName), label);
export const ibtn = (iconName, title, props = {}) => h('button', {type: 'button', title, 'aria-label': title, ...props, class: `ibtn ${props.class || ''}`.trim()}, icon(iconName));

const PALETTE = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
export function colorFor(text) {
  let n = 0; for (const ch of String(text)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[n % PALETTE.length];
}
export function favicon(host) {
  const f = h('span', {class: 'fav', 'aria-hidden': 'true'}, (host || '?').replace(/^www\./, '').charAt(0));
  f.style.background = colorFor(host);
  return f;
}
export function dotFor(id) { const d = h('span', {class: 'dot'}); d.style.background = colorFor(id); return d; }
export function timeAgo(ts, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function toast(message, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = h('div', {id: 'toasts', role: 'status', 'aria-live': 'polite'}); document.body.append(box); }
  const t = h('div', {class: `toast ${kind}`}, message);
  box.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 6000 : 3000);
}

function modal(build) {
  return new Promise(resolve => {
    const dialog = h('dialog', {class: 'modal'});
    const close = value => { dialog.close(); dialog.remove(); resolve(value); };
    build(dialog, close);
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    document.body.append(dialog);
    dialog.showModal();
  });
}
/** Resolves true/false. `danger` styles the confirm button; `requireText` makes the user type a word first. */
export function confirmDialog({title, message, confirmLabel = 'Confirm', danger = false, requireText = ''}) {
  return modal((dialog, close) => {
    const input = requireText ? h('input', {class: 'input', 'aria-label': `Type ${requireText} to confirm`, autocomplete: 'off'}) : null;
    const ok = btn(confirmLabel, null, {class: danger ? 'danger solid' : 'primary', type: 'submit', disabled: Boolean(requireText)});
    if (input) input.addEventListener('input', () => { ok.disabled = input.value !== requireText; });
    dialog.append(h('form', {onsubmit: e => { e.preventDefault(); close(true); }},
      h('h3', {}, title), h('p', {}, message), requireText && h('label', {}, `Type ${requireText} to continue`, input),
      h('div', {class: 'actions'}, btn('Cancel', null, {onclick: () => close(false)}), ok)));
  });
}
/** fields: [{name,label,value,multiline,placeholder}]. Resolves object or null. */
export function formDialog({title, fields, submitLabel = 'Save', message = ''}) {
  return modal((dialog, close) => {
    const inputs = fields.map(f => ({f, el: h(f.multiline ? 'textarea' : 'input', {class: 'input', value: f.value || '', placeholder: f.placeholder || '', rows: f.multiline ? 3 : null, maxlength: f.max || null, required: f.required === false ? null : true})}));
    dialog.append(h('form', {onsubmit: e => { e.preventDefault(); close(Object.fromEntries(inputs.map(({f, el}) => [f.name, el.value]))); }},
      h('h3', {}, title), message && h('p', {}, message), inputs.map(({f, el}) => h('label', {}, f.label, el)),
      h('div', {class: 'actions'}, btn('Cancel', null, {onclick: () => close(null)}), btn(submitLabel, null, {class: 'primary', type: 'submit'}))));
    setTimeout(() => inputs[0]?.el.focus(), 0);
  });
}
export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = h('a', {href: url, download: filename});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
