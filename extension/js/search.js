/** Conservative matching: preserve paths, fragments and meaningful query parameters. */
export function safeURL(value) {
  if (typeof value !== 'string' || value.length > 8192) throw new Error('Enter a valid HTTP or HTTPS URL (maximum 8,192 characters).');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete URL beginning with https:// or http://.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only HTTP and HTTPS pages without embedded credentials can be saved.');
  }
  return url.href;
}
export function isSupported(url) { try { safeURL(url); return true; } catch { return false; } }
export function normalizeURL(value) {
  const url = new URL(safeURL(value));
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|dclid|msclkid)$/i.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}
export function domain(url) { try { return new URL(url).hostname; } catch { return 'Unavailable page'; } }
export function matches(item, query) {
  const haystack = `${item.title || item.name || ''} ${item.url || ''} ${(item.tabs || []).map(t => `${t.title} ${t.url}`).join(' ')}`.toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every(word => haystack.includes(word));
}
export function filterTabs(tabs, {query = '', collection = '', host = '', days = '', favorite = false, sort = 'newest'} = {}) {
  const cutoff = days ? Date.now() - Number(days) * 86400000 : 0;
  const result = tabs.filter(t => matches(t, query) && (!collection || t.collectionIds.includes(collection)) && (!host || domain(t.url) === host) && (!favorite || t.favorite) && t.createdAt >= cutoff);
  return result.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'domain' ? domain(a.url).localeCompare(domain(b.url)) : sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
}
export function duplicateGroups(tabs) {
  const groups = new Map();
  for (const tab of tabs) {
    const key = normalizeURL(tab.url);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tab);
  }
  return [...groups.entries()].filter(([, items]) => items.length > 1).map(([url, items]) => ({url, tabs: items.sort((a, b) => b.createdAt - a.createdAt)}));
}
export function cleanDuplicates(state, keys) {
  const wanted = new Set(keys);
  let removed = 0;
  for (const group of duplicateGroups(state.tabs).filter(g => wanted.has(g.url))) {
    const [keeper, ...others] = group.tabs;
    keeper.favorite = group.tabs.some(t => t.favorite);
    keeper.collectionIds = [...new Set(group.tabs.flatMap(t => t.collectionIds))];
    const ids = new Set(others.map(t => t.id));
    state.tabs = state.tabs.filter(t => !ids.has(t.id));
    removed += others.length;
  }
  return {removed};
}
