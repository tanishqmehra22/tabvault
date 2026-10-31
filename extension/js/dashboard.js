import {request, subscribe} from './storage.js';
import {applyTheme, parseImport, exportJSON, MAX_IMPORT_BYTES} from './settings.js';
import {filterTabs, matches, domain, duplicateGroups} from './search.js';
import {h, $, icon, btn, ibtn, favicon, dotFor, colorFor, timeAgo, plural, toast, confirmDialog, formDialog, download} from './ui.js';

const VIEWS = [['tabs', 'All Saved Tabs', 'layers'], ['collections', 'Collections', 'folder'], ['sessions', 'Sessions', 'history'], ['search', 'Search & Duplicates', 'search'], ['settings', 'Settings', 'settings']];
const PAGE = 48;
let vault = null, view = 'tabs', rendering = false;
const ui = {filters: {query: '', collection: '', host: '', days: '', sort: 'newest', favorite: false}, selected: new Set(), shown: PAGE, searchQuery: '', openSessions: new Set(), picks: new Set()};

const fail = e => toast(e.message || String(e), 'error');
async function act(action, payload, ok) {
  try {
    const r = await request(action, payload);
    if (ok) toast(typeof ok === 'function' ? ok(r) : ok);
    return {ok: true, r};
  } catch (e) { fail(e); return {ok: false}; }
}
const collName = id => vault.collections.find(c => c.id === id)?.name || 'Unknown';
const saveMsg = r => [r.saved && `Saved ${plural(r.saved, 'tab')}`, r.duplicates && `${plural(r.duplicates, 'duplicate')} already saved`, r.skipped && `${r.skipped} skipped`].filter(Boolean).join(' · ') || 'Nothing to save';
const pageHeader = (eyebrow, title, desc, count, ...actions) => h('div', {class: 'page-h'},
  h('div', {}, h('div', {class: 'eyebrow'}, eyebrow), h('h2', {}, title, count !== undefined && h('span', {class: 'count-pill'}, count)), desc && h('p', {}, desc)),
  h('div', {class: 'toolbar'}, ...actions));
const empty = (title, body) => h('div', {class: 'empty'}, h('h3', {}, title), body);
const select = (options, value, onchange, label) => {
  const s = h('select', {class: 'input', 'aria-label': label, onchange: e => onchange(e.target.value)},
    options.map(([v, text]) => h('option', {value: v, selected: v === value}, text)));
  return s;
};

/* ---------- Saved tabs ---------- */
function tabCard(tab, listMode) {
  const host = domain(tab.url), sel = ui.selected.has(tab.id), primary = tab.collectionIds[0];
  const card = h('article', {class: `tcard${sel ? ' selected' : ''}`});
  card.style.setProperty('--accent', colorFor(primary));
  card.append(
    h('div', {class: 'head'},
      h('input', {type: 'checkbox', class: 'cb', checked: sel, 'aria-label': `Select ${tab.title}`, onchange: e => { e.target.checked ? ui.selected.add(tab.id) : ui.selected.delete(tab.id); render(); }}),
      favicon(host), h('span', {class: 'host'}, host), h('span', {class: 'when'}, timeAgo(tab.createdAt)),
      ibtn('star', tab.favorite ? 'Remove favorite' : 'Favorite', {class: `star${tab.favorite ? ' on' : ''}`, 'aria-pressed': String(tab.favorite), onclick: () => act('favorite', {id: tab.id, value: !tab.favorite}, tab.favorite ? 'Removed from favorites' : 'Added to favorites')})),
    h('h4', {title: tab.title}, tab.title),
    h('div', {class: 'url trunc', title: tab.url}, tab.url),
    h('div', {class: 'foot'},
      h('span', {class: 'chip'}, dotFor(primary), collName(primary), tab.collectionIds.length > 1 && ` +${tab.collectionIds.length - 1}`),
      btn('Open', 'open', {onclick: () => act('open-tab', {id: tab.id})}),
      ibtn('move', 'Move to collection', {onclick: () => moveDialog([tab.id])}),
      ibtn('trash', 'Delete tab', {class: 'danger', onclick: () => deleteTabs([tab.id])})));
  return card;
}
async function moveDialog(ids) {
  const choice = await pickCollection(`Move ${plural(ids.length, 'tab')} to…`, 'Move');
  if (choice) { const r = await act('move-tabs', {ids, collectionId: choice}, `Moved to ${collName(choice)}`); if (r.ok) ui.selected.clear(); }
}
function pickCollection(title, label) {
  return formDialogSelect(title, label);
}
function formDialogSelect(title, label) {
  return new Promise(resolve => {
    const sel = h('select', {class: 'input'}, vault.collections.map(c => h('option', {value: c.id}, c.name)));
    const dlg = h('dialog', {class: 'modal'});
    const close = v => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.append(h('form', {onsubmit: e => { e.preventDefault(); close(sel.value); }}, h('h3', {}, title), h('label', {}, 'Collection', sel),
      h('div', {class: 'actions'}, btn('Cancel', null, {onclick: () => close(null)}), btn(label, null, {class: 'primary', type: 'submit'}))));
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    document.body.append(dlg); dlg.showModal();
  });
}
async function deleteTabs(ids) {
  if (ids.length > 1 && !await confirmDialog({title: `Delete ${ids.length} tabs?`, message: 'They will be removed from your vault. This cannot be undone — export a backup first if unsure.', confirmLabel: 'Delete', danger: true})) return;
  const r = await act('delete-tabs', {ids}, r => `Deleted ${plural(r.removed, 'tab')}`);
  if (r.ok) ids.forEach(id => ui.selected.delete(id));
}
function tabsView() {
  const f = ui.filters, all = vault.tabs, hosts = [...new Set(all.map(t => domain(t.url)))].sort();
  const base = f.collection && !vault.collections.some(c => c.id === f.collection) ? (f.collection = '') : f.collection;
  const items = filterTabs(all, f), visible = items.slice(0, ui.shown), listMode = vault.settings.view === 'list';
  const ids = items.map(t => t.id), selected = [...ui.selected].filter(id => all.some(t => t.id === id));
  ui.selected = new Set(selected);
  const root = h('div', {class: 'stack'});
 
  root.append(pageHeader('TabVault', f.favorite ? 'Favorites' : 'All Saved Tabs', 'Search, organize and restore the tabs you saved on this device.', `${plural(items.length, 'tab')}`,
    btn('Add URL', 'plus', {onclick: addUrl}), btn('Export JSON', 'download', {onclick: doExport})));
  root.append(h('div', {class: 'panel toolbar'},
    h('input', {class: 'input grow', type: 'search', placeholder: 'Filter by title, URL or domain…', 'aria-label': 'Filter saved tabs', value: f.query, oninput: e => { f.query = e.target.value; ui.shown = PAGE; renderKeepFocus(e.target); }}),
    select([['', 'All collections'], ...vault.collections.map(c => [c.id, c.name])], base, v => { f.collection = v; ui.shown = PAGE; render(); }, 'Collection'),
    select([['', 'Domain: any'], ...hosts.map(x => [x, x])], f.host, v => { f.host = v; ui.shown = PAGE; render(); }, 'Domain'),
    select([['', 'Date: all time'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days']], f.days, v => { f.days = v; ui.shown = PAGE; render(); }, 'Date'),
    select([['newest', 'Newest first'], ['oldest', 'Oldest first'], ['title', 'Title A–Z'], ['domain', 'Domain A–Z']], f.sort, v => { f.sort = v; render(); }, 'Sort'),
    btn('Favorites', 'star', {class: f.favorite ? 'primary' : '', 'aria-pressed': String(f.favorite), onclick: () => { f.favorite = !f.favorite; render(); }}),
    h('div', {class: 'seg', role: 'group', 'aria-label': 'View'},
      h('button', {type: 'button', title: 'Grid view', 'aria-label': 'Grid view', 'aria-pressed': String(!listMode), onclick: () => setView('grid')}, icon('grid')),
      h('button', {type: 'button', title: 'List view', 'aria-label': 'List view', 'aria-pressed': String(listMode), onclick: () => setView('list')}, icon('list')))));
  if (selected.length) root.append(h('div', {class: 'panel selbar'}, h('b', {}, `${plural(selected.length, 'tab')} selected`),
    btn('Restore in new window', 'restore', {class: 'primary', onclick: () => act('restore-tabs', {ids: selected}, r => `Opened ${plural(r.opened, 'tab')}`)}),
    btn('Move to collection', 'move', {onclick: () => moveDialog(selected)}), btn('Delete', 'trash', {class: 'danger', onclick: () => deleteTabs(selected)}),
    btn('Select all matching', null, {onclick: () => { ids.forEach(id => ui.selected.add(id)); render(); }}),
    btn('Clear', 'x', {onclick: () => { ui.selected.clear(); render(); }})));
  if (!all.length) root.append(empty('Your vault is empty', 'Use the TabVault toolbar popup to save tabs, or add a URL above.'));
  else if (!items.length) root.append(empty('No tabs match these filters', 'Try clearing the search or filters.'));
  else {
    root.append(h('div', {class: `cards${listMode ? ' list' : ''}`}, visible.map(t => tabCard(t, listMode))));
    root.append(h('div', {class: 'more'}, h('span', {}, `Showing ${visible.length} of ${items.length} saved tabs`),
      items.length > visible.length && btn(`Load next ${Math.min(PAGE, items.length - visible.length)}`, null, {onclick: () => { ui.shown += PAGE; render(); }})));
  }
  return root;
}
async function setView(v) { await act('settings', {changes: {view: v}}); }
async function addUrl() {
  const v = await formDialog({title: 'Add URL', submitLabel: 'Save', fields: [{name: 'url', label: 'Web address', placeholder: 'https://example.com'}, {name: 'title', label: 'Title (optional)', required: false}]});
  if (v) await act('add-url', {url: v.url.trim(), title: v.title.trim() || undefined, collectionId: ui.filters.collection || vault.settings.defaultCollectionId}, saveMsg);
}
function doExport() {
  download(`tabvault-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(vault));
  toast('Backup exported');
}

/* ---------- Collections ---------- */
async function collectionForm(existing) {
  const v = await formDialog({title: existing ? 'Rename collection' : 'New collection', fields: [{name: 'name', label: 'Name', value: existing?.name, max: 80}, {name: 'description', label: 'Description (optional)', value: existing?.description, multiline: true, required: false, max: 300}]});
  if (!v) return;
  if (existing) await act('rename-collection', {id: existing.id, ...v}, 'Collection updated');
  else await act('create-collection', v, 'Collection created');
}
function collectionsView() {
  const root = h('div', {class: 'stack'});
  root.append(pageHeader('Organize', 'Collections', 'Group saved tabs by project, topic or reading list.', vault.collections.length, btn('New collection', 'plus', {class: 'primary', onclick: () => collectionForm()})));
  root.append(h('div', {class: 'grid2'}, vault.collections.map(c => {
    const tabs = vault.tabs.filter(t => t.collectionIds.includes(c.id));
    return h('section', {class: 'ccard'},
      h('h3', {}, dotFor(c.id), c.name, h('span', {class: 'count-pill'}, tabs.length)),
      c.description && h('div', {class: 'muted'}, c.description),
      h('ul', {}, tabs.slice(0, 3).map(t => h('li', {}, favicon(domain(t.url)), h('span', {class: 'trunc'}, t.title)))),
      h('div', {class: 'acts'},
        btn('View', 'layers', {onclick: () => { ui.filters.collection = c.id; ui.shown = PAGE; location.hash = '#tabs'; }}),
        btn('Restore', 'restore', {disabled: !tabs.length, onclick: () => act('restore-collection', {id: c.id}, r => `Opened ${plural(r.opened, 'tab')}`)}),
        c.id !== 'inbox' && ibtn('edit', 'Rename', {onclick: () => collectionForm(c)}),
        c.id !== 'inbox' && ibtn('trash', 'Delete collection', {class: 'danger', onclick: async () => {
          if (await confirmDialog({title: `Delete “${c.name}”?`, message: 'Tabs only in this collection move to Inbox. No saved tabs are deleted.', confirmLabel: 'Delete collection', danger: true})) await act('delete-collection', {id: c.id}, 'Collection deleted');
        }})));
  })));
  return root;
}

/* ---------- Sessions ---------- */
async function saveSession() {
  const stamp = new Date().toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
  const v = await formDialog({title: 'Save current window as session', message: 'Saves every web page open in your current window.', fields: [{name: 'name', label: 'Session name', value: `Session — ${stamp}`, max: 80}]});
  if (v) await act('save-session', {name: v.name}, r => r.duplicate ? 'An identical session already exists' : `Saved ${plural(r.session.tabs.length, 'tab')}${r.skipped ? ` (${r.skipped} skipped)` : ''}`);
}
function sessionsView() {
  const root = h('div', {class: 'stack'});
  root.append(pageHeader('History', 'Sessions', 'Snapshots of a whole window you can reopen later.', vault.sessions.length, btn('Save current window', 'save', {class: 'primary', onclick: saveSession})));
  if (!vault.sessions.length) root.append(empty('No sessions yet', 'Save a window to restore it later.'));
  for (const s of vault.sessions) {
    const open = ui.openSessions.has(s.id);
    root.append(h('section', {class: 'sess'},
      h('div', {class: 'top'}, h('div', {class: 'grow'}, h('h3', {}, s.name), h('div', {class: 'muted'}, `${plural(s.tabs.length, 'tab')} • ${new Date(s.createdAt).toLocaleString()}`)),
        btn(open ? 'Hide tabs' : 'Show tabs', null, {'aria-expanded': String(open), onclick: () => { open ? ui.openSessions.delete(s.id) : ui.openSessions.add(s.id); render(); }}),
        btn('Restore', 'restore', {class: 'primary', onclick: () => act('restore-session', {id: s.id}, r => `Opened ${plural(r.opened, 'tab')} in a new window`)}),
        ibtn('trash', 'Delete session', {class: 'danger', onclick: async () => { if (await confirmDialog({title: `Delete “${s.name}”?`, message: 'Saved tabs in your vault are not affected.', confirmLabel: 'Delete session', danger: true})) await act('delete-session', {id: s.id}, 'Session deleted'); }})),
      open && h('ul', {}, s.tabs.map(t => h('li', {}, favicon(domain(t.url)), h('span', {class: 'trunc', title: t.url}, t.title), h('span', {class: 'faint'}, domain(t.url)))))));
  }
  return root;
}

/* ---------- Search & duplicates ---------- */
function searchView() {
  const q = ui.searchQuery, root = h('div', {class: 'stack'});
  root.append(pageHeader('Find', 'Search & Duplicate Finder', 'Search tabs and sessions, and clean up repeated URLs.'));
  const input = h('input', {class: 'input', type: 'search', placeholder: 'Search saved tabs and sessions…', 'aria-label': 'Search', value: q, oninput: e => { ui.searchQuery = e.target.value; renderKeepFocus(e.target); }});
  root.append(h('div', {class: 'panel'}, input));
  if (q.trim()) {
    const tabs = filterTabs(vault.tabs, {query: q}), sessions = vault.sessions.filter(s => matches(s, q));
    root.append(h('h3', {class: 'sec-h'}, `Saved tabs (${tabs.length})`), tabs.length ? h('div', {class: 'cards'}, tabs.slice(0, 24).map(t => tabCard(t))) : h('div', {class: 'muted'}, 'No matching tabs.'));
    root.append(h('h3', {class: 'sec-h'}, `Sessions (${sessions.length})`), sessions.length ? h('div', {}, sessions.map(s => h('div', {class: 'sess'}, h('b', {}, s.name), h('span', {class: 'muted'}, `${plural(s.tabs.length, 'tab')} • ${timeAgo(s.createdAt)}`)))) : h('div', {class: 'muted'}, 'No matching sessions.'));
  }
  const groups = duplicateGroups(vault.tabs);
  const picked = groups.filter(g => ui.picks.has(g.url));
  root.append(h('h3', {class: 'sec-h'}, `Duplicate URLs (${groups.length})`),
    h('p', {class: 'muted'}, 'URLs are compared after removing tracking parameters (utm_*, fbclid, gclid…). Cleaning keeps the newest copy and merges its favorite flag and collections.'));
  if (!groups.length) root.append(empty('No duplicates found', 'Every saved URL is unique.'));
  else {
    const extra = gs => gs.reduce((n, g) => n + g.tabs.length - 1, 0);
    root.append(h('div', {class: 'toolbar'}, btn('Select all', null, {onclick: () => { groups.forEach(g => ui.picks.add(g.url)); render(); }}), btn('Clear selection', null, {onclick: () => { ui.picks.clear(); render(); }}),
      btn(`Remove duplicates in selection (${extra(picked)})`, 'trash', {class: 'danger', disabled: !picked.length, onclick: async () => {
        if (await confirmDialog({title: `Remove ${plural(extra(picked), 'duplicate tab')}?`, message: `${plural(picked.length, 'URL')} will keep only their newest saved copy. Removed copies cannot be recovered.`, confirmLabel: 'Remove duplicates', danger: true})) {
          const r = await act('deduplicate', {keys: picked.map(g => g.url)}, r => `Removed ${plural(r.removed, 'duplicate')}`); if (r.ok) ui.picks.clear();
        }
      }})));
    for (const g of groups) root.append(h('div', {class: 'dupe'},
      h('label', {class: 'it'}, h('input', {type: 'checkbox', checked: ui.picks.has(g.url), onchange: e => { e.target.checked ? ui.picks.add(g.url) : ui.picks.delete(g.url); render(); }}), h('span', {class: 'u'}, g.url)),
      g.tabs.map((t, i) => h('div', {class: 'it'}, h('span', {class: 'chip'}, i === 0 ? 'Keep' : 'Remove'), h('span', {class: 'trunc'}, t.title), `• ${timeAgo(t.createdAt)} • ${t.collectionIds.map(collName).join(', ')}`))));
  }
  return root;
}

/* ---------- Settings ---------- */
async function importFile(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) return toast('Backup exceeds the 8 MB import limit.', 'error');
  let data;
  try { data = parseImport(await file.text()); } catch (e) { return fail(e); }
  if (await confirmDialog({title: 'Replace your vault with this backup?', message: `The backup holds ${plural(data.tabs.length, 'tab')}, ${plural(data.collections.length, 'collection')} and ${plural(data.sessions.length, 'session')}. Your current vault (${plural(vault.tabs.length, 'tab')}) will be replaced. Export first if you want to keep it.`, confirmLabel: 'Replace vault', danger: true}))
    await act('import', {data}, 'Backup imported');
}
function settingsView() {
  const s = vault.settings, root = h('div', {class: 'stack'});
  root.append(pageHeader('Preferences', 'Settings', 'Everything is stored locally in this browser profile.'));
  const usage = h('span', {class: 'muted'}, 'Calculating…');
  request('usage').then(u => { usage.textContent = `${(u.bytes / 1024).toFixed(1)} KB used of ${(u.quota / 1048576).toFixed(0)} MB`; }).catch(() => { usage.textContent = 'Unavailable'; });
  const row = (title, desc, control) => h('div', {class: 'form-row'}, h('div', {class: 'lbl'}, h('b', {}, title), h('span', {class: 'muted'}, desc)), control);
  const fileInput = h('input', {type: 'file', accept: 'application/json,.json', class: 'sr', id: 'importFile', onchange: e => { importFile(e.target.files[0]); e.target.value = ''; }});
  root.append(h('div', {class: 'panel'},
    row('Theme', 'Choose light, dark, or follow your system.', select([['dark', 'Dark'], ['light', 'Light'], ['system', 'System']], s.theme, v => act('settings', {changes: {theme: v}}, 'Theme saved'), 'Theme')),
    row('Default view', 'How saved tabs are displayed.', select([['grid', 'Grid'], ['list', 'List']], s.view, v => act('settings', {changes: {view: v}}), 'Default view')),
    row('Default collection', 'Where new saves go unless you pick another.', select(vault.collections.map(c => [c.id, c.name]), s.defaultCollectionId, v => act('settings', {changes: {defaultCollectionId: v}}, 'Default collection saved'), 'Default collection')),
    row('Skip duplicate saves', 'When on, saving a URL you already have adds it to the target collection instead of creating a copy.', h('input', {type: 'checkbox', checked: s.preventDuplicates, 'aria-label': 'Skip duplicate saves', onchange: e => act('settings', {changes: {preventDuplicates: e.target.checked}}, 'Preference saved')}))));
  root.append(h('div', {class: 'panel'}, h('div', {class: 'sec-h'}, 'Backup'),
    row('Export to JSON', 'Download your tabs, collections, sessions and settings.', btn('Export JSON', 'download', {onclick: doExport})),
    row('Import from JSON', 'Validated before anything changes. Importing replaces the current vault after you confirm.', h('span', {}, fileInput, h('label', {for: 'importFile', class: 'btn', tabindex: '0', onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } }}, icon('upload'), 'Choose file…'))),
    row('Storage', 'Measured from chrome.storage.local.', usage)));
  root.append(h('div', {class: 'panel danger-zone'}, h('div', {class: 'sec-h'}, 'Danger zone'),
    row('Erase all data', 'Permanently deletes every saved tab, collection and session and restores default settings.', btn('Erase vault…', 'trash', {class: 'danger', onclick: async () => {
      if (await confirmDialog({title: 'Erase your entire vault?', message: 'This cannot be undone. Export a backup first if you might want this data again.', confirmLabel: 'Erase everything', danger: true, requireText: 'DELETE'})) await act('reset', {}, 'Vault erased');
    }}))));
  return root;
}

/* ---------- shell ---------- */
const RENDER = {tabs: tabsView, collections: collectionsView, sessions: sessionsView, search: searchView, settings: settingsView};
function renderNav() {
  const counts = {tabs: vault.tabs.length, collections: vault.collections.length, sessions: vault.sessions.length};
  $('#nav').replaceChildren(...VIEWS.map(([id, label, ic]) => h('a', {href: `#${id}`, 'aria-current': id === view ? 'page' : null}, icon(ic), label, counts[id] !== undefined && h('span', {class: 'count'}, counts[id]))));
  $('#statTabs').textContent = vault.tabs.length; $('#statSessions').textContent = vault.sessions.length;
}
function render() {
  if (!vault) return;
  applyTheme(vault.settings.theme);
  renderNav();
  $('#view').replaceChildren(RENDER[view]());
  document.title = `${VIEWS.find(v => v[0] === view)[1]} — TabVault`;
}
function renderKeepFocus(input) {
  const pos = input.selectionStart; render();
  const again = $(`#view input[type=search]`); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
}
async function refresh() { try { vault = await request('read'); render(); } catch (e) { fail(e); } }
function route() {
  const id = location.hash.slice(1); view = RENDER[id] ? id : 'tabs';
  document.body.classList.remove('nav-open'); render();
}
function boot() {
  $('#menuBtn').append(icon('menu')); $('#searchIcon').append(icon('search')); $('#shieldIcon').append(icon('shield'));
  $('#quickSave').append(icon('bolt'), h('span', {class: 'lbl'}, 'Quick save window'));
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#quickSave').addEventListener('click', () => act('save-window', {collectionId: vault?.settings.defaultCollectionId}, saveMsg));
  $('#gq').addEventListener('input', e => { ui.searchQuery = e.target.value; if (view !== 'search') location.hash = '#search'; else render(); });
  document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('#gq').focus(); } });
  window.addEventListener('hashchange', route);
  subscribe(refresh);
  request('read').then(v => { vault = v; route(); }).catch(fail);
}
boot();
