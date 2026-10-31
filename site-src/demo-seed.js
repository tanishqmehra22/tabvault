// Demo only: seeds sample data once per browser, and shows a banner. Not part of the extension.
import {request} from './js/storage.js';
const banner = document.createElement('div');
banner.textContent = 'Live demo · sample data · stored only in this browser';
Object.assign(banner.style, {position: 'fixed', top: '0', left: '0', right: '0', zIndex: 200, font: '600 11px Inter, sans-serif', textAlign: 'center', padding: '3px', background: '#06b6d4', color: '#022', letterSpacing: '.04em'});
document.addEventListener('DOMContentLoaded', () => { document.body.append(banner); document.body.style.paddingTop = '20px'; });
try {
  if (!localStorage.getItem('demo.seeded')) {
    localStorage.setItem('demo.seeded', '1');
    const dev = (await request('create-collection', {name: 'Development', description: 'Code, docs and repos'})).id;
    const res = (await request('create-collection', {name: 'College Research', description: 'Papers and notes'})).id;
    const rd = (await request('create-collection', {name: 'Reading List', description: ''})).id;
    const items = [
      ['https://github.com/astral-sh/uv', 'uv: extremely fast Python package manager', dev], ['https://developer.chrome.com/docs/extensions/mv3/intro/', 'Chrome Extensions Manifest V3 overview', dev],
      ['https://arxiv.org/abs/1706.03762', 'Attention Is All You Need', res], ['https://www.nature.com/articles/s41586-019-1666-5', 'Quantum supremacy using a programmable processor', res],
      ['https://news.ycombinator.com/', 'Hacker News', rd], ['https://linear.app/method', 'The Linear Method', rd], ['https://stripe.com/docs/api/payment_intents', 'Payment Intents API Reference', 'inbox'],
      ['https://developer.mozilla.org/en-US/docs/Web/CSS/grid', 'CSS grid layout - MDN', dev],
    ];
    for (const [url, title, collectionId] of items) await request('add-url', {url, title, collectionId});
    const vault = await request('read'); await request('favorite', {id: vault.tabs[0].id, value: true});
    await request('settings', {changes: {preventDuplicates: true}});
    await request('save-session', {name: 'Morning research'});
  }
} catch (e) { console.warn('demo seed failed', e); }
