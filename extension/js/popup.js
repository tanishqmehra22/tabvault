import {request, subscribe} from './storage.js';
import {applyTheme} from './settings.js';
import {filterTabs, matches, domain} from './search.js';
import {h, $, icon, ibtn, favicon, dotFor, timeAgo, toast, plural} from './ui.js';

let vault = null, openTabs = [], target = null, query = '';

const fail = e => toast(e.message || String(e), 'error');
const run = async (action, payload, okMessage) => {
  try {
    const r = await request(action, payload);
    if (okMessage) toast(typeof okMessage === 'function' ? okMessage(r) : okMessage);
    return r;
  } catch (e) { fail(e); }
};
const saveMessage = r => {
  const parts = [r.saved && `Saved ${plural(r.saved, 'tab')}`, r.duplicates && `${plural(r.duplicates, 'duplicate')} already saved`, r.skipped && `${r.skipped} skipped (not web pages)`].filter(Boolean);
  return parts.join(' · ') || 'Nothing to save';
};

async function refresh() {
  vault = await request('read');
  openTabs = await chrome.tabs.query({currentWindow: true});
  if (!vault.collections.some(c => c.id === target)) target = vault.settings.defaultCollectionId;
  applyTheme(vault.settings.theme);
  render();
}

function render() {
  const saveable = openTabs.filter(t => /^https?:/i.test(t.url || t.pendingUrl || ''));
  $('#openCount').textContent = `${openTabs.length} open`;
  const all = $('#saveAll'); all.replaceChildren(icon('bolt'), `Save All Tabs (${saveable.length})`);
  $('#saveCurrent').replaceChildren(icon('plus'), 'Save Current Tab');
  $('#restoreLast').replaceChildren(icon('history'), vault.sessions[0] ? `Restore Last Session (${vault.sessions[0].tabs.length})` : 'No sessions yet');
  $('#restoreLast').disabled = !vault.sessions[0];
  $('#openDash').replaceChildren(icon('open'), 'Open Dashboard');

  $('#chips').replaceChildren(...vault.collections.map(c => {
    const chip = h('button', {type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(c.id === target), title: c.description || c.name,
      onclick: () => { target = c.id; render(); }}, dotFor(c.id), c.name);
    return chip;
  }));
  renderList();
}

function savedRow(tab) {
  const host = domain(tab.url);
  return h('div', {class: 'row', tabindex: '0', role: 'button', title: tab.url, onclick: () => run('open-tab', {id: tab.id}),
    onkeydown: e => { if (e.key === 'Enter') e.currentTarget.click(); }},
    favicon(host),
    h('span', {class: 'meta'}, h('span', {class: 't trunc'}, tab.title), h('span', {class: 's trunc'}, `${host} • ${timeAgo(tab.createdAt)}`, tab.favorite && h('span', {class: 'tag'}, 'Starred'))),
    h('span', {class: 'acts'},
      ibtn('star', tab.favorite ? 'Remove favorite' : 'Favorite', {class: tab.favorite ? 'on' : '', onclick: async e => { e.stopPropagation(); await run('favorite', {id: tab.id, value: !tab.favorite}); }}),
      ibtn('trash', 'Delete saved tab', {class: 'danger', onclick: async e => { e.stopPropagation(); await run('delete-tabs', {ids: [tab.id]}, 'Tab removed from your vault'); }})));
}
function openRow(tab) {
  const host = domain(tab.url || '');
  return h('div', {class: 'row', tabindex: '0', role: 'button', title: 'Switch to this tab', onclick: async () => {
    await chrome.tabs.update(tab.id, {active: true}); await chrome.windows.update(tab.windowId, {focused: true}); window.close();
  }, onkeydown: e => { if (e.key === 'Enter') e.currentTarget.click(); }},
    favicon(host), h('span', {class: 'meta'}, h('span', {class: 't trunc'}, tab.title || tab.url), h('span', {class: 's trunc'}, `${host || 'Browser page'} • open now`)),
    h('span', {class: 'acts'}, ibtn('save', 'Save this tab', {onclick: async e => { e.stopPropagation(); await run('save-tab', {tabId: tab.id, collectionId: target}, saveMessage); }})));
}

function renderList() {
  const list = $('#list');
  if (!query.trim()) {
    $('#listTitle').textContent = `Recently saved (${Math.min(vault.tabs.length, 5)})`;
    const recent = filterTabs(vault.tabs, {sort: 'newest'}).slice(0, 5);
    list.replaceChildren(...(recent.length ? recent.map(savedRow) : [h('div', {class: 'empty'}, 'Nothing saved yet. Save your current tab to get started.')]));
    return;
  }
  $('#listTitle').textContent = 'Search results';
  const saved = filterTabs(vault.tabs, {query}).slice(0, 8);
  const live = openTabs.filter(t => matches({title: t.title, url: t.url}, query)).slice(0, 8);
  list.replaceChildren(
    ...(live.length ? [h('div', {class: 'group'}, 'Open tabs'), ...live.map(openRow)] : []),
    ...(saved.length ? [h('div', {class: 'group'}, 'Saved tabs'), ...saved.map(savedRow)] : []),
    ...(!live.length && !saved.length ? [h('div', {class: 'empty'}, `No tabs match “${query.trim()}”.`)] : []));
}

function boot() {
  $('#settingsBtn').append(icon('settings'));
  $('#searchIcon').append(icon('search'));
  const dash = hash => chrome.tabs.create({url: chrome.runtime.getURL(`dashboard.html${hash}`)}).then(() => window.close());
  $('#openDash').addEventListener('click', () => dash('#tabs'));
  $('#settingsBtn').addEventListener('click', () => dash('#settings'));
  $('#manage').addEventListener('click', () => dash('#collections'));
  $('#q').addEventListener('input', e => { query = e.target.value; if (vault) renderList(); });
  $('#saveAll').addEventListener('click', () => run('save-window', {collectionId: target}, saveMessage));
  $('#saveCurrent').addEventListener('click', () => run('save-current', {collectionId: target}, saveMessage));
  $('#restoreLast').addEventListener('click', () => run('restore-session', {id: vault.sessions[0].id}, r => `Restoring ${plural(r.opened, 'tab')} in a new window`));
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); } });
  subscribe(() => refresh().catch(fail));
  refresh().catch(fail);
}
boot();
