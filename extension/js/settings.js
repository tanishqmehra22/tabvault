import {safeURL} from './search.js';
export const DEFAULT_SETTINGS = Object.freeze({theme: 'dark', defaultCollectionId: 'inbox', view: 'grid', preventDuplicates: true});
export function initialState() {
  return {schemaVersion: 1, revision: 0, tabs: [], collections: [{id: 'inbox', name: 'Inbox', description: 'Your quick saves, ready to organize.', createdAt: Date.now()}], sessions: [], settings: {...DEFAULT_SETTINGS}};
}
const assert = (test, message) => { if (!test) throw new Error(`Invalid backup: ${message}`); };
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const string = (x, max, empty = false) => typeof x === 'string' && x.length <= max && (empty || x.trim().length > 0);
const timestamp = x => Number.isSafeInteger(x) && x >= 0 && x <= 8640000000000000;
function uniqueIDs(items, kind) {
  const ids = new Set();
  for (const item of items) {
    assert(object(item) && string(item.id, 100) && !ids.has(item.id), `${kind} IDs must be present and unique.`);
    ids.add(item.id);
  }
  return ids;
}
/** Whitelist every field. Return a fresh object; never merge untrusted object keys. */
export function validateState(raw) {
  assert(object(raw) && raw.schemaVersion === 1, 'unsupported format or schema version. Use a TabVault JSON export.');
  for (const key of ['tabs', 'collections', 'sessions']) assert(Array.isArray(raw[key]) && raw[key].length <= 20000, `${key} must be an array of at most 20,000 items.`);
  uniqueIDs(raw.tabs, 'Tab'); const collectionIDs = uniqueIDs(raw.collections, 'Collection'); uniqueIDs(raw.sessions, 'Session');
  assert(collectionIDs.has('inbox'), 'the Inbox collection is required.');
  const collections = raw.collections.map(c => {
    assert(string(c.name, 80) && string(c.description, 300, true) && timestamp(c.createdAt), 'invalid collection fields.');
    return {id: c.id, name: c.name.trim(), description: c.description, createdAt: c.createdAt};
  });
  const entry = t => {
    assert(object(t) && string(t.title, 1000), 'each tab needs a title.');
    return {url: safeURL(t.url), title: t.title};
  };
  const tabs = raw.tabs.map(t => {
    assert(timestamp(t.createdAt) && typeof t.favorite === 'boolean', 'invalid tab date or favorite.');
    assert(Array.isArray(t.collectionIds) && t.collectionIds.length > 0 && t.collectionIds.length <= collections.length && t.collectionIds.every(id => collectionIDs.has(id)), 'a tab refers to a missing collection.');
    return {id: t.id, ...entry(t), collectionIds: [...new Set(t.collectionIds)], favorite: t.favorite, createdAt: t.createdAt};
  });
  let sessionTabCount = 0;
  const sessions = raw.sessions.map(s => {
    assert(string(s.name, 80) && timestamp(s.createdAt) && Array.isArray(s.tabs) && s.tabs.length > 0 && s.tabs.length <= 2000, 'invalid session fields.');
    sessionTabCount += s.tabs.length;
    assert(sessionTabCount <= 30000, 'too many session tabs.');
    return {id: s.id, name: s.name.trim(), createdAt: s.createdAt, tabs: s.tabs.map(entry)};
  });
  const p = raw.settings;
  assert(object(p) && ['dark', 'light', 'system'].includes(p.theme) && ['grid', 'list'].includes(p.view) && typeof p.preventDuplicates === 'boolean' && collectionIDs.has(p.defaultCollectionId), 'invalid settings.');
  return {schemaVersion: 1, revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0, tabs, collections, sessions, settings: {theme: p.theme, view: p.view, preventDuplicates: p.preventDuplicates, defaultCollectionId: p.defaultCollectionId}};
}
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export function parseImport(text) {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Backup exceeds the 8 MB import limit.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. No data was changed.'); }
  return validateState(raw);
}
export function exportJSON(state) { return JSON.stringify({...validateState(state), exportedAt: new Date().toISOString()}, null, 2); }
export function updateSettings(state, changes) {
  const next = validateState({...state, settings: {...state.settings, ...changes}});
  state.settings = next.settings;
  return {message: 'Preferences saved.'};
}
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}
