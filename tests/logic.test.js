import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, validateState, parseImport, exportJSON, updateSettings, MAX_IMPORT_BYTES} from '../extension/js/settings.js';
import {safeURL, normalizeURL, isSupported, domain, matches, filterTabs, duplicateGroups, cleanDuplicates} from '../extension/js/search.js';
import {saveTabs, deleteTabs} from '../extension/js/tabs.js';
import {createCollection, renameCollection, deleteCollection, moveTabs, validName} from '../extension/js/collections.js';
import {saveSession, deleteSession} from '../extension/js/sessions.js';
import {createQueue} from '../extension/js/storage.js';
import {timeAgo} from '../extension/js/ui.js';

const tab = (url, title = url) => ({url, title});

test('safeURL accepts http(s) only and rejects credentials', () => {
  assert.equal(safeURL('https://example.com/a?b=1#c'), 'https://example.com/a?b=1#c');
  for (const bad of ['javascript:alert(1)', 'chrome://extensions', 'file:///etc/passwd', 'https://u:p@example.com', 'nonsense', '']) assert.throws(() => safeURL(bad), undefined, bad);
  assert.throws(() => safeURL('https://e.com/' + 'a'.repeat(9000)));
  assert.equal(isSupported('chrome://flags'), false);
});
test('normalizeURL strips tracking params but keeps meaningful ones', () => {
  assert.equal(normalizeURL('https://e.com/p?id=7&utm_source=x&fbclid=1'), 'https://e.com/p?id=7');
  assert.equal(normalizeURL('https://e.com/p?id=7'), normalizeURL('https://e.com/p?id=7&gclid=z'));
  assert.notEqual(normalizeURL('https://e.com/p?id=7'), normalizeURL('https://e.com/p?id=8'));
});
test('domain and matches', () => {
  assert.equal(domain('https://docs.example.com/x'), 'docs.example.com');
  assert.equal(domain('bad'), 'Unavailable page');
  assert.ok(matches({title: 'Rust Book', url: 'https://doc.rust-lang.org'}, 'rust book'));
  assert.ok(matches({title: 'x', url: 'https://github.com/a'}, 'github'));
  assert.ok(!matches({title: 'x', url: 'https://github.com/a'}, 'gitlab'));
});

test('saveTabs saves, skips unsupported, and merges duplicates into collections', () => {
  const s = initialState();
  const col = createCollection(s, 'Work');
  let r = saveTabs(s, [tab('https://a.com/'), tab('chrome://settings'), tab('https://b.com/')]);
  assert.deepEqual(r, {saved: 2, duplicates: 0, skipped: 1});
  r = saveTabs(s, [tab('https://a.com/?utm_source=n')], col.id);
  assert.deepEqual(r, {saved: 0, duplicates: 1, skipped: 0});
  assert.equal(s.tabs.length, 2);
  assert.deepEqual(s.tabs.find(t => t.url === 'https://a.com/').collectionIds.sort(), ['inbox', col.id].sort());
  s.settings.preventDuplicates = false;
  assert.equal(saveTabs(s, [tab('https://a.com/')]).saved, 1);
  assert.throws(() => saveTabs(s, [tab('https://a.com/')], 'missing'));
  assert.doesNotThrow(() => validateState(s));
});
test('deleteTabs removes only requested ids', () => {
  const s = initialState(); saveTabs(s, [tab('https://a.com/'), tab('https://b.com/')]);
  assert.equal(deleteTabs(s, [s.tabs[0].id]).removed, 1);
  assert.equal(s.tabs.length, 1);
  assert.equal(deleteTabs(s, ['nope']).removed, 0);
});

test('filterTabs: query, collection, host, favorite, sort', () => {
  const s = initialState(); const c = createCollection(s, 'Dev');
  saveTabs(s, [tab('https://github.com/x', 'Zeta repo')]); saveTabs(s, [tab('https://news.com/y', 'Alpha story')], c.id);
  const byTitle = t => s.tabs.find(x => x.title === t);
  byTitle('Zeta repo').createdAt = 1000; byTitle('Alpha story').createdAt = 2000; byTitle('Zeta repo').favorite = true;
  assert.equal(filterTabs(s.tabs, {query: 'github'}).length, 1);
  assert.equal(filterTabs(s.tabs, {collection: c.id}).length, 1);
  assert.equal(filterTabs(s.tabs, {host: 'news.com'})[0].title, 'Alpha story');
  assert.equal(filterTabs(s.tabs, {favorite: true}).length, 1);
  assert.deepEqual(filterTabs(s.tabs, {sort: 'title'}).map(t => t.title), ['Alpha story', 'Zeta repo']);
  assert.deepEqual(filterTabs(s.tabs, {sort: 'oldest'}).map(t => t.title), ['Zeta repo', 'Alpha story']);
  assert.equal(filterTabs(s.tabs, {days: '1'}).length, 0); // both timestamps are ancient
});

test('duplicate detection and safe cleanup keep newest, merge favorites and collections', () => {
  const s = initialState(); s.settings.preventDuplicates = false;
  const c = createCollection(s, 'Dev');
  saveTabs(s, [tab('https://a.com/p?utm_medium=x', 'old')]); saveTabs(s, [tab('https://a.com/p', 'new')], c.id); saveTabs(s, [tab('https://solo.com/')]);
  s.tabs.find(t => t.title === 'old').createdAt = 1; s.tabs.find(t => t.title === 'old').favorite = true;
  const groups = duplicateGroups(s.tabs);
  assert.equal(groups.length, 1); assert.equal(groups[0].tabs[0].title, 'new');
  assert.equal(cleanDuplicates(s, ['https://other/']).removed, 0, 'unselected keys are untouched');
  assert.equal(cleanDuplicates(s, [groups[0].url]).removed, 1);
  const keeper = s.tabs.find(t => t.title === 'new');
  assert.equal(keeper.favorite, true);
  assert.deepEqual(keeper.collectionIds.sort(), ['inbox', c.id].sort());
  assert.equal(s.tabs.length, 2);
  assert.doesNotThrow(() => validateState(s));
});

test('collection CRUD, uniqueness, inbox protection and fallback on delete', () => {
  const s = initialState();
  const c = createCollection(s, '  Research  ', 'notes');
  assert.equal(c.name, 'Research');
  assert.throws(() => createCollection(s, 'research'), /already exists/);
  assert.throws(() => validName('   ')); assert.throws(() => validName('x'.repeat(81)));
  renameCollection(s, c.id, 'Reading', 'new'); assert.equal(s.collections[1].name, 'Reading');
  assert.throws(() => renameCollection(s, 'inbox', 'X', ''));
  assert.throws(() => deleteCollection(s, 'inbox'));
  saveTabs(s, [tab('https://a.com/')], c.id); saveTabs(s, [tab('https://b.com/')]);
  moveTabs(s, [s.tabs[1].id], c.id); assert.deepEqual(s.tabs[1].collectionIds, [c.id]);
  assert.throws(() => moveTabs(s, [s.tabs[0].id], 'ghost'));
  s.settings.defaultCollectionId = c.id;
  deleteCollection(s, c.id);
  assert.ok(s.tabs.every(t => t.collectionIds.length && t.collectionIds.every(id => id === 'inbox')));
  assert.equal(s.settings.defaultCollectionId, 'inbox');
  assert.doesNotThrow(() => validateState(s));
});

test('sessions: save with metadata, skip unsupported, dedupe, delete', () => {
  const s = initialState();
  assert.throws(() => saveSession(s, 'Empty', [tab('chrome://x')]), /no HTTP/);
  const {session, skipped, duplicate} = saveSession(s, 'Morning', [tab('https://a.com/', 'A'), tab('about:blank')]);
  assert.equal(skipped, 1); assert.equal(duplicate, false);
  assert.deepEqual(session.tabs, [{url: 'https://a.com/', title: 'A'}]);
  assert.ok(session.createdAt > 0 && session.id);
  assert.equal(saveSession(s, 'Morning', [tab('https://a.com/', 'A')]).duplicate, true);
  assert.equal(s.sessions.length, 1);
  assert.throws(() => saveSession(s, '', [tab('https://a.com/')]));
  deleteSession(s, session.id); assert.equal(s.sessions.length, 0);
  assert.throws(() => deleteSession(s, session.id));
});

test('export -> import round-trips and preserves ids', () => {
  const s = initialState(); createCollection(s, 'Dev'); saveTabs(s, [tab('https://a.com/', 'A')], s.collections[1].id); saveSession(s, 'S', [tab('https://a.com/')]);
  const back = parseImport(exportJSON(s));
  assert.deepEqual(back.tabs, s.tabs); assert.deepEqual(back.collections, s.collections); assert.deepEqual(back.sessions, s.sessions);
});
test('import validation rejects malformed, hostile and oversize data', () => {
  const good = () => JSON.parse(exportJSON(initialState()));
  assert.throws(() => parseImport('not json'), /not valid JSON/);
  assert.throws(() => parseImport('[]'));
  assert.throws(() => parseImport(JSON.stringify({...good(), schemaVersion: 2})), /schema/);
  assert.throws(() => parseImport('x'.repeat(MAX_IMPORT_BYTES + 1)), /8 MB/);
  let d = good(); d.tabs = [{id: 't', url: 'javascript:alert(1)', title: 'x', collectionIds: ['inbox'], favorite: false, createdAt: 1}];
  assert.throws(() => validateState(d));
  d = good(); d.tabs = [{id: 't', url: 'https://a.com/', title: 'x', collectionIds: ['ghost'], favorite: false, createdAt: 1}];
  assert.throws(() => validateState(d), /missing collection/);
  d = good(); d.tabs = ['a', 'b'].map(() => ({id: 'same', url: 'https://a.com/', title: 'x', collectionIds: ['inbox'], favorite: false, createdAt: 1}));
  assert.throws(() => validateState(d), /unique/);
  d = good(); d.collections = []; assert.throws(() => validateState(d), /Inbox/);
  d = good(); d.settings.theme = 'neon'; assert.throws(() => validateState(d), /settings/);
  // unknown/prototype keys are dropped, not merged
  d = JSON.parse('{"__proto__":{"polluted":true},"extra":1,' + JSON.stringify(good()).slice(1));
  const out = validateState(d); assert.equal(out.extra, undefined); assert.equal({}.polluted, undefined);
});

test('settings update validates and persists theme choice', () => {
  const s = initialState();
  updateSettings(s, {theme: 'light'}); assert.equal(s.settings.theme, 'light');
  updateSettings(s, {view: 'list', preventDuplicates: false}); assert.equal(s.settings.view, 'list');
  assert.throws(() => updateSettings(s, {theme: 'bad'})); assert.throws(() => updateSettings(s, {defaultCollectionId: 'ghost'}));
  assert.equal(s.settings.theme, 'light', 'failed update leaves state unchanged');
});

test('write queue serializes jobs and survives failures', async () => {
  const q = createQueue(), order = [];
  const a = q(async () => { await new Promise(r => setTimeout(r, 20)); order.push('a'); });
  const b = q(async () => { order.push('b'); throw new Error('boom'); });
  const c = q(async () => { order.push('c'); return 'ok'; });
  await a; await assert.rejects(b, /boom/); assert.equal(await c, 'ok'); assert.deepEqual(order, ['a', 'b', 'c']);
});

test('timeAgo buckets', () => {
  const now = 1e12;
  assert.equal(timeAgo(now - 5e3, now), 'just now'); assert.equal(timeAgo(now - 120e3, now), '2m ago');
  assert.equal(timeAgo(now - 3 * 3600e3, now), '3h ago'); assert.equal(timeAgo(now - 30 * 3600e3, now), 'Yesterday');
  assert.equal(timeAgo(now - 5 * 86400e3, now), '5d ago');
});
