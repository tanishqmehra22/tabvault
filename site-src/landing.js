document.getElementById('reset').addEventListener('click', () => {
  try { ['stub.storage', 'stub.tabs', 'demo.seeded'].forEach(k => localStorage.removeItem(k)); } catch {}
  document.querySelectorAll('iframe').forEach(f => f.contentWindow.location.reload());
});
