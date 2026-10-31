export function validName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) throw new Error('Use a name between 1 and 80 characters.');
  return value.trim();
}
export function requireCollection(state, id) {
  const collection = state.collections.find(c => c.id === id);
  if (!collection) throw new Error('This collection no longer exists. Please choose another.');
  return collection;
}
export function createCollection(state, name, description = '') {
  name = validName(name);
  if (state.collections.some(c => c.name.toLowerCase() === name.toLowerCase())) throw new Error('A collection with that name already exists.');
  if (typeof description !== 'string' || description.length > 300) throw new Error('Keep descriptions under 300 characters.');
  const collection = {id: crypto.randomUUID(), name, description: description.trim(), createdAt: Date.now()};
  state.collections.push(collection);
  return collection;
}
export function renameCollection(state, id, name, description) {
  if (id === 'inbox') throw new Error('Inbox is the permanent fallback collection.');
  const c = requireCollection(state, id); name = validName(name);
  if (state.collections.some(item => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) throw new Error('A collection with that name already exists.');
  if (typeof description !== 'string' || description.length > 300) throw new Error('Keep descriptions under 300 characters.');
  Object.assign(c, {name, description: description.trim()});
}
export function deleteCollection(state, id) {
  if (id === 'inbox') throw new Error('Inbox cannot be deleted.');
  requireCollection(state, id);
  state.collections = state.collections.filter(c => c.id !== id);
  for (const tab of state.tabs) {
    tab.collectionIds = tab.collectionIds.filter(cid => cid !== id);
    if (!tab.collectionIds.length) tab.collectionIds = ['inbox'];
  }
  if (state.settings.defaultCollectionId === id) state.settings.defaultCollectionId = 'inbox';
}
export function moveTabs(state, ids, collectionId) {
  requireCollection(state, collectionId);
  const selected = new Set(ids);
  for (const tab of state.tabs) if (selected.has(tab.id)) tab.collectionIds = [collectionId];
}
