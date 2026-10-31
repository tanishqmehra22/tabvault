import {initialState, validateState} from './settings.js';
export const STORAGE_KEY = 'tabvault.v1';
export async function readState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] === undefined ? initialState() : validateState(result[STORAGE_KEY]);
}
export async function writeState(state) {
  const safe = validateState(state);
  // A single key makes each committed vault snapshot atomic.
  await chrome.storage.local.set({[STORAGE_KEY]: safe});
}
export function createQueue() {
  let tail = Promise.resolve();
  return job => {
    const result = tail.then(job);
    tail = result.catch(() => {});
    return result;
  };
}
export async function request(action, payload = {}) {
  if (!globalThis.chrome?.runtime?.id) throw new Error('Load TabVault as an unpacked Chrome extension to use your vault.');
  let response;
  try { response = await chrome.runtime.sendMessage({source: 'tabvault', action, payload}); }
  catch (error) { throw new Error(`Could not reach TabVault. Reload the extension and retry. ${error.message}`); }
  if (!response?.ok) throw new Error(response?.error || 'TabVault could not finish this action.');
  return response.result;
}
export function subscribe(callback) {
  const listener = (changes, area) => { if (area === 'local' && changes[STORAGE_KEY]) callback(); };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
