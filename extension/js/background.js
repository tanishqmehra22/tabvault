import {readState, writeState, createQueue} from './storage.js';
import {initialState, validateState, updateSettings} from './settings.js';
import {saveTabs, currentTabs, deleteTabs, openTab, restoreWindow} from './tabs.js';
import {createCollection, renameCollection, deleteCollection, moveTabs, requireCollection} from './collections.js';
import {saveSession, deleteSession, requireSession} from './sessions.js';
import {cleanDuplicates} from './search.js';
const queue = createQueue();
// Per-entity cooldown persists across service-worker restarts, but not browser restarts.
async function guardedRestore(key, entries) {
  const locks = (await chrome.storage.session.get('restoreLocks')).restoreLocks || {};
  if (Date.now() - (locks[key] || 0) < 4000) throw new Error('That restore was just requested. Wait a few seconds before restoring it again.');
  const now = Date.now();
  const recent = Object.fromEntries(Object.entries(locks).filter(([, t]) => now - t < 4000));
  await chrome.storage.session.set({restoreLocks: {...recent, [key]: now}});
  try { return await restoreWindow(entries); }
  catch (error) { await chrome.storage.session.set({restoreLocks: recent}); throw error; }
}
async function execute(action, p) {
  const state = await readState();
  if (action === 'read') return state;
  if (action === 'usage') return {bytes: await chrome.storage.local.getBytesInUse(null), quota: chrome.storage.local.QUOTA_BYTES};
  if (p.expectedRevision !== undefined && p.expectedRevision !== state.revision) throw new Error('Your vault changed in another view. Review the latest data and try again.');
  let result;
  switch (action) {
    case 'save-current': {
      const tabs = await currentTabs(p.windowId);
      result = saveTabs(state, tabs.filter(t => t.active), p.collectionId); break;
    }
    case 'save-tab': result = saveTabs(state, [await chrome.tabs.get(p.tabId)], p.collectionId); break;
    case 'save-window': result = saveTabs(state, await currentTabs(p.windowId), p.collectionId); break;
    case 'add-url': result = saveTabs(state, [{url: p.url, title: p.title}], p.collectionId); if (!result.saved && !result.duplicates) throw new Error('Only valid HTTP and HTTPS URLs can be saved.'); break;
    case 'favorite': {
      const tab = state.tabs.find(t => t.id === p.id); if (!tab) throw new Error('Tab no longer exists.');
      tab.favorite = Boolean(p.value); break;
    }
    case 'delete-tabs': result = deleteTabs(state, p.ids); break;
    case 'move-tabs': moveTabs(state, p.ids, p.collectionId); break;
    case 'create-collection': result = createCollection(state, p.name, p.description); break;
    case 'rename-collection': renameCollection(state, p.id, p.name, p.description); break;
    case 'delete-collection': deleteCollection(state, p.id); break;
    case 'save-session': result = saveSession(state, p.name, await currentTabs(p.windowId)); break;
    case 'delete-session': deleteSession(state, p.id); break;
    case 'settings': result = updateSettings(state, p.changes); break;
    case 'deduplicate': result = cleanDuplicates(state, p.keys); break;
    case 'import': {
      const imported = validateState(p.data);
      imported.revision = state.revision + 1;
      await writeState(imported); return {message: 'Backup imported.'};
    }
    case 'reset': {
      const fresh = initialState(); fresh.revision = state.revision + 1;
      await writeState(fresh); return {message: 'Vault erased.'};
    }
    case 'open-tab': {
      const tab = state.tabs.find(t => t.id === p.id); if (!tab) throw new Error('Tab no longer exists.');
      await openTab(tab.url); return {opened: 1};
    }
    case 'restore-tabs': return guardedRestore(`tabs:${[...p.ids].sort().join(',')}`, state.tabs.filter(t => p.ids.includes(t.id)));
    case 'restore-collection': requireCollection(state, p.id); return guardedRestore(`collection:${p.id}`, state.tabs.filter(t => t.collectionIds.includes(p.id)));
    case 'restore-session': return guardedRestore(`session:${p.id}`, requireSession(state, p.id).tabs);
    default: throw new Error('Unknown TabVault action.');
  }
  state.revision++;
  await writeState(state);
  return result || {message: 'Saved.'};
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || message?.source !== 'tabvault') return false;
  queue(() => execute(message.action, message.payload || {})).then(
    result => sendResponse({ok: true, result}),
    error => sendResponse({ok: false, error: /quota/i.test(error.message) ? 'Local storage is full. Export a backup, then remove unneeded items before retrying.' : error.message || 'Chrome could not finish this action.'})
  );
  return true;
});
