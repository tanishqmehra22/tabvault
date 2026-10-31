import {safeURL, isSupported} from './search.js';
import {validName} from './collections.js';
export function saveSession(state, name, entries) {
  name = validName(name);
  const tabs = entries.filter(t => isSupported(t.pendingUrl || t.url)).map(t => ({url: safeURL(t.pendingUrl || t.url), title: String(t.title || t.pendingUrl || t.url).slice(0, 1000)}));
  if (!tabs.length) throw new Error('This window has no HTTP or HTTPS tabs to save. Chrome internal pages and unavailable URLs are skipped.');
  const fingerprint = JSON.stringify(tabs.map(t => t.url));
  const existing = state.sessions.find(s => s.name === name && JSON.stringify(s.tabs.map(t => t.url)) === fingerprint);
  if (existing) return {session: existing, duplicate: true, skipped: entries.length - tabs.length};
  const session = {id: crypto.randomUUID(), name, tabs, createdAt: Date.now()};
  state.sessions.unshift(session);
  return {session, duplicate: false, skipped: entries.length - tabs.length};
}
export function requireSession(state, id) {
  const session = state.sessions.find(s => s.id === id);
  if (!session) throw new Error('This session no longer exists.');
  return session;
}
export function deleteSession(state, id) { requireSession(state, id); state.sessions = state.sessions.filter(s => s.id !== id); }
