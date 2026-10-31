// DEV-ONLY: minimal chrome.* stub so the real extension pages and background.js run in a normal web page.
(() => {
  const K = 'stub.storage', TK = 'stub.tabs', bc = new BroadcastChannel('stub-storage');
  const load = () => JSON.parse(localStorage.getItem(K) || '{}');
  const listeners = [], changed = [], session = {};
  const fire = changes => changed.forEach(fn => fn(changes, 'local'));
  bc.onmessage = e => fire(e.data);
  const defaultTabs = [
    {id: 1, windowId: 1, active: true, title: 'TabVault Docs', url: 'https://example.com/docs'},
    {id: 6, windowId: 1, active: false, title: 'MDN: Array.prototype.map', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map'},
    {id: 2, windowId: 1, active: false, title: 'Rust Book', url: 'https://doc.rust-lang.org/book/?utm_source=x'},
    {id: 3, windowId: 1, active: false, title: 'Rust Book (dupe)', url: 'https://doc.rust-lang.org/book/'},
    {id: 4, windowId: 1, active: false, title: 'Extensions', url: 'chrome://extensions'},
    {id: 5, windowId: 1, active: false, title: 'GitHub', url: 'https://github.com/'},
  ];
  const tabs = () => JSON.parse(localStorage.getItem(TK) || 'null') || defaultTabs;
  window.__stub = {opened: [], windows: [], activated: []};
  window.chrome = {
    runtime: {
      id: 'stubid', getURL: p => new URL(p, location.href).href,
      onMessage: {addListener: fn => listeners.push(fn)},
      sendMessage: msg => new Promise(res => { let sent = false; for (const fn of listeners) if (fn(msg, {id: 'stubid'}, r => { sent = true; res(r); })) return; if (!sent) res(undefined); }),
    },
    storage: {
      local: {
        QUOTA_BYTES: 10485760,
        get: async key => { const s = load(); return key === null || key === undefined ? s : (key in s ? {[key]: s[key]} : {}); },
        set: async obj => { const s = load(), ch = {}; for (const [k, v] of Object.entries(obj)) { ch[k] = {oldValue: s[k], newValue: v}; s[k] = v; } localStorage.setItem(K, JSON.stringify(s)); fire(ch); bc.postMessage(ch); },
        getBytesInUse: async () => (localStorage.getItem(K) || '').length,
      },
      session: {get: async k => ({[k]: session[k]}), set: async o => Object.assign(session, o)},
      onChanged: {addListener: fn => changed.push(fn), removeListener: fn => changed.splice(changed.indexOf(fn), 1)},
    },
    tabs: {
      query: async () => tabs(), get: async id => tabs().find(t => t.id === id),
      create: async o => { __stub.opened.push(o.url); if (window.__demo) window.open(o.url, '_blank', 'noopener'); return {id: 99}; }, update: async (id, o) => { __stub.activated.push(id); return {}; },
    },
    windows: {create: async o => { __stub.windows.push(o.url); if (window.__demo) window.open(o.url[0], '_blank', 'noopener'); return {id: 7}; }, update: async () => ({})},
  };
})();
