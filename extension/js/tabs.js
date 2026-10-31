import {safeURL, isSupported, normalizeURL} from './search.js';
import {requireCollection} from './collections.js';
export async function currentTabs(windowId) {
  const query = Number.isInteger(windowId) ? {windowId} : {currentWindow: true};
  return chrome.tabs.query(query);
}
export function saveTabs(state, entries, collectionId = state.settings.defaultCollectionId) {
  requireCollection(state, collectionId);
  let saved = 0, duplicates = 0, skipped = 0;
  const known = new Map(state.tabs.map(t => [normalizeURL(t.url), t]));
  for (const tab of entries) {
    const candidate = tab.pendingUrl || tab.url;
    if (!isSupported(candidate)) { skipped++; continue; }
    const url = safeURL(candidate), key = normalizeURL(url);
    if (state.settings.preventDuplicates && known.has(key)) {
      const existing = known.get(key);
      if (!existing.collectionIds.includes(collectionId)) existing.collectionIds.push(collectionId);
      duplicates++; continue;
    }
    const entry = {id: crypto.randomUUID(), url, title: String(tab.title || url).slice(0, 1000), collectionIds: [collectionId], favorite: false, createdAt: Date.now()};
    state.tabs.unshift(entry); known.set(key, entry); saved++;
  }
  return {saved, duplicates, skipped};
}
export async function openTab(url) { return chrome.tabs.create({url: safeURL(url)}); }
export async function restoreWindow(entries) {
  const urls = entries.map(t => safeURL(t.url));
  if (!urls.length) throw new Error('There are no tabs to restore.');
  // One browser call avoids a partially restored sequence of windows.
  const win = await chrome.windows.create({url: urls, focused: true, type: 'normal'});
  return {opened: urls.length, windowId: win.id};
}
export function deleteTabs(state, ids) {
  const selected = new Set(ids);
  const before = state.tabs.length;
  state.tabs = state.tabs.filter(t => !selected.has(t.id));
  return {removed: before - state.tabs.length};
}
