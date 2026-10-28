/* ============================================
   EXPLORE BROWSER — app.js
   ============================================ */

const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const VALID_THEMES = ['midnight', 'ocean', 'ember', 'sakura', 'forest', 'daylight'];

/* ---------- STATE ---------- */
// Load saved settings, but RESET if theme is invalid (so old "blue" doesn't break things)
let savedSettings = {};
try { savedSettings = JSON.parse(localStorage.getItem('explore_settings') || '{}'); } catch {}
if (!VALID_THEMES.includes(savedSettings.theme)) {
  savedSettings.theme = 'midnight';
  localStorage.setItem('explore_settings', JSON.stringify(savedSettings));
}

const state = {
  tabs: [{ id: 1, title: 'Explore', url: 'explore://home', history: [], hIndex: -1 }],
  activeTab: 1,
  history:   JSON.parse(localStorage.getItem('explore_history')   || '[]'),
  bookmarks: JSON.parse(localStorage.getItem('explore_bookmarks') || '[]'),
  downloads: JSON.parse(localStorage.getItem('explore_downloads') || '[]'),
  zoom: 100,
  settings: {
    theme:   savedSettings.theme || 'midnight',
    motion:  !!savedSettings.motion,
    reading: !!savedSettings.reading
  }
};

const save = () => {
  localStorage.setItem('explore_history',   JSON.stringify(state.history));
  localStorage.setItem('explore_bookmarks', JSON.stringify(state.bookmarks));
  localStorage.setItem('explore_downloads', JSON.stringify(state.downloads));
  localStorage.setItem('explore_settings',  JSON.stringify(state.settings));
};

/* ---------- TOAST ---------- */
function toast(msg, ms = 2500) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- SEARCH ENGINE CORE ---------- */
const ENGINES = {
  google:  q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  bing:    q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  duck:    q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  youtube: q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
};

const isURL = s => /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(s.trim());
const normalizeURL = s => /^https?:\/\//.test(s.trim()) ? s.trim() : 'https://' + s.trim();

function navigate(input, mode = 'auto') {
  const raw = (input || '').trim();
  if (!raw) return;
  const target = (mode === 'url' || isURL(raw)) ? normalizeURL(raw) : ENGINES.google(raw);
  addHistory(raw, target);
  openTab(target, raw);
  toast(`Opening: ${raw}`);
}

function addHistory(label, url) {
  state.history.unshift({ label, url, time: Date.now() });
  state.history = state.history.slice(0, 200);
  save(); renderHistory();
}

function openTab(url, label) {
  const tab = state.tabs.find(t => t.id === state.activeTab);
  if (tab) {
    tab.url = url; tab.title = label || url;
    tab.history.push(url); tab.hIndex = tab.history.length - 1;
  }
  $('#addressInput').value = url;
  renderTabs();
}

/* ---------- TABS ---------- */
let tabIdSeq = 1;
function newTab() {
  const id = ++tabIdSeq;
  state.tabs.push({ id, title: 'New Tab', url: 'explore://home', history: ['explore://home'], hIndex: 0 });
  state.activeTab = id;
  renderTabs();
  $('#addressInput').value = '';
  toast('New tab opened');
}

function closeTab() {
  if (state.tabs.length === 1) return toast('Cannot close last tab');
  state.tabs = state.tabs.filter(t => t.id !== state.activeTab);
  state.activeTab = state.tabs[state.tabs.length - 1].id;
  renderTabs();
}

function duplicateTab() {
  const t = state.tabs.find(x => x.id === state.activeTab);
  const id = ++tabIdSeq;
  state.tabs.push({ id, title: t.title, url: t.url, history: [...t.history], hIndex: t.hIndex });
  state.activeTab = id;
  renderTabs();
  toast('Tab duplicated');
}

function renderTabs() {
  const active = state.tabs.find(t => t.id === state.activeTab);
  const tabEl = $('.active-tab span');
  if (tabEl && active) tabEl.textContent = active.title.slice(0, 20);
  $('#tabCount').textContent = state.tabs.length;
  $('#addressInput').value = active?.url?.startsWith('explore://') ? '' : active?.url || '';
}

/* ---------- HISTORY / BOOKMARKS ---------- */
function renderHistory() {
  const panel = $('#panel-history');
  if (!panel) return;
  panel.innerHTML = state.history.length
    ? state.history.map(h => `<div class="list-row"><button class="row-main" data-url="${h.url}">${escapeHTML(h.label)}</button><button class="row-x" data-del="${h.url}">×</button></div>`).join('')
    : '<p class="empty">No history yet.</p>';
}

function renderBookmarks() {
  const panel = $('#panel-bookmarks');
  if (!panel) return;
  panel.innerHTML = state.bookmarks.length
    ? state.bookmarks.map(b => `<div class="list-row"><button class="row-main" data-url="${b.url}">${escapeHTML(b.title)}</button><button class="row-x" data-del-bm="${b.url}">×</button></div>`).join('')
    : '<p class="empty">No bookmarks yet. Star a page to save it.</p>';
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ---------- THEMES ---------- */
function applyTheme(name) {
  if (!VALID_THEMES.includes(name)) name = 'midnight';
  document.documentElement.setAttribute('data-theme', name);
  state.settings.theme = name;
  save();
  $$('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === name));
}

/* ---------- TOOLS ---------- */
const TOOLS = {
  'Notes': () => { const note = localStorage.getItem('explore_note') || ''; return `<textarea id="noteArea" rows="8" style="width:100%">${note}</textarea>`; },
  'Calculator': () => `<input id="calcInput" placeholder="e.g. 12 * 8 + 4" style="width:100%;font-size:18px"> <button id="calcGo" style="margin-top:8px">=</button> <div id="calcOut" style="margin-top:12px;font-size:22px"></div>`,
  'Translate': () => `<textarea id="trIn" rows="4" style="width:100%"></textarea><p style="margin:8px 0">Opens Google Translate in a new tab.</p><button id="trGo">Translate</button>`,
  'Weather': () => `<p>Kigali, Rwanda</p><h2 style="font-size:42px">22°C ☀️</h2><p>Sunny · Feels like 22°C</p>`,
  'Focus timer': () => `<h2 id="timer" style="font-size:36px">25:00</h2><button id="timerStart">Start</button> <button id="timerReset">Reset</button>`,
  'Screenshot': () => `<p>Use your OS screenshot tool:</p><ul style="margin-top:8px"><li>Windows: <kbd>Win+Shift+S</kbd></li><li>Mac: <kbd>Cmd+Shift+4</kbd></li><li>Linux: <kbd>PrintScreen</kbd></li></ul>`,
  'QR generator': () => `<input id="qrIn" placeholder="Text or URL" style="width:100%"><button id="qrGo" style="margin-top:8px">Generate</button><div id="qrOut" style="margin-top:12px"></div>`,
  'AI Assistant': () => `<p>Ask anything — opens your preferred AI in a new tab.</p><input id="aiIn" placeholder="Your question" style="width:100%;margin-top:8px"><button id="aiGo" style="margin-top:8px">Ask</button>`
};

function openTool(name) {
  $('#modalTitle').textContent = name;
  const body = $('#modalBody');
  body.innerHTML = (TOOLS[name] || (() => `<p>${name} coming soon.</p>`))();
  $('#modal').showModal();
  wireTool(name);
}

function wireTool(name) {
  if (name === 'Notes') { const ta = $('#noteArea'); ta.oninput = () => localStorage.setItem('explore_note', ta.value); }
  if (name === 'Calculator') {
    $('#calcGo').onclick = () => {
      try {
        const expr = $('#calcInput').value.replace(/[^0-9+\-*/().% ]/g, '');
        $('#calcOut').textContent = Function('"use strict";return (' + expr + ')')();
      } catch { $('#calcOut').textContent = 'Invalid expression'; }
    };
  }
  if (name === 'Translate') $('#trGo').onclick = () => window.open('https://translate.google.com/?text=' + encodeURIComponent($('#trIn').value), '_blank');
  if (name === 'Focus timer') {
    let secs = 25*60, timerId = null;
    const label = $('#timer');
    const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    $('#timerStart').onclick = () => {
      if (timerId) { clearInterval(timerId); timerId = null; return; }
      timerId = setInterval(() => {
        secs--; label.textContent = fmt(secs);
        if (secs <= 0) { clearInterval(timerId); timerId = null; toast('Focus session done!'); }
      }, 1000);
    };
    $('#timerReset').onclick = () => { clearInterval(timerId); timerId = null; secs = 25*60; label.textContent = fmt(secs); };
  }
  if (name === 'QR generator') {
    $('#qrGo').onclick = () => {
      const v = encodeURIComponent($('#qrIn').value || 'https://explore.example');
      $('#qrOut').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${v}" alt="QR">`;
    };
  }
  if (name === 'AI Assistant') $('#aiGo').onclick = () => window.open('https://chatgpt.com/?q=' + encodeURIComponent($('#aiIn').value), '_blank');
}

/* ---------- CLOCK ---------- */
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#dateLabel').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
setInterval(tick, 1000); tick();

/* ---------- WIRE UP ---------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.settings.theme);
  renderHistory(); renderBookmarks(); renderTabs();

  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); navigate($('#searchInput').value); });
  $('#addressForm').addEventListener('submit', e => { e.preventDefault(); navigate($('#addressInput').value); });

  $('#voiceBtn').onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('Speech recognition not supported');
    const rec = new SR(); rec.lang = 'en-US';
    rec.onresult = e => { $('#searchInput').value = e.results[0][0].transcript; $('#searchForm').requestSubmit(); };
    rec.start(); toast('Listening…');
  };

  $('#aiBtn').onclick = () => openTool('AI Assistant');
  $('#backBtn').onclick = () => toast('Back (demo)');
  $('#forwardBtn').onclick = () => toast('Forward (demo)');
  $('#reloadBtn').onclick = () => { toast('Reloaded'); tick(); };

  $('#bookmarkBtn').onclick = () => {
    const url = $('#addressInput').value;
    if (!url) return toast('Open a page first');
    const title = prompt('Bookmark name:', url);
    if (!title) return;
    state.bookmarks.push({ title, url }); save(); renderBookmarks(); toast('Bookmarked!');
  };

  $('#newTab').onclick = newTab;
  $('#navNewTab').onclick = newTab;
  $('#newTabRight').onclick = newTab;
  $('#closeTab').onclick = closeTab;
  $('#duplicateTab').onclick = duplicateTab;

  $$('.trend').forEach(b => b.onclick = () => navigate(b.dataset.query));
  $('#refreshTrending').onclick = () => {
    const list = $('.trend-list');
    list.style.opacity = '0.3';
    setTimeout(() => { list.style.opacity = '1'; toast('Trending refreshed'); }, 400);
  };

  $('#exploreBtn').onclick = () => navigate('https://duckduckgo.com');
  $$('.shortcut[href]').forEach(a => a.onclick = e => { e.preventDefault(); navigate(a.href); });
  $$('[data-tool]').forEach(b => b.onclick = () => openTool(b.dataset.tool));
  $$('.nav-item[data-panel]').forEach(b => b.onclick = () => showPanel(b.dataset.panel));
  $$('[data-panel]').forEach(b => { if (!b.classList.contains('nav-item')) b.onclick = () => showPanel(b.dataset.panel); });

  /* Opera-style theme cards */
  $$('.theme-card').forEach(c => c.onclick = () => {
    const name = c.dataset.theme;
    applyTheme(name);
    toast(`${name.charAt(0).toUpperCase() + name.slice(1)} theme applied`);
  });

  $('#zoomOut').onclick = () => setZoom(state.zoom - 10);
  $('#zoomIn').onclick = () => setZoom(state.zoom + 10);

  $('#readingToggle').onchange = e => { state.settings.reading = e.target.checked; save(); document.body.classList.toggle('reading-mode', e.target.checked); };
  $('#motionToggle').onchange = e => { state.settings.motion = e.target.checked; save(); document.body.classList.toggle('reduce-motion', e.target.checked); };

  $('#fullscreenBtn').onclick = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  };

  $('#clearData').onclick = () => {
    if (!confirm('Clear all Explore data?')) return;
    ['explore_history','explore_bookmarks','explore_downloads','explore_settings','explore_note'].forEach(k => localStorage.removeItem(k));
    location.reload();
  };

  $('#modalClose').onclick = () => $('#modal').close();

  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 't') { e.preventDefault(); newTab(); }
    if (e.ctrlKey && e.key === 'w') { e.preventDefault(); closeTab(); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); $('#addressInput').focus(); $('#addressInput').select(); }
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); $('#searchInput').focus(); }
  });

  document.addEventListener('click', e => {
    if (e.target.matches('[data-url]')) navigate(e.target.dataset.url, 'url');
    if (e.target.matches('[data-del]')) { state.history = state.history.filter(h => h.url !== e.target.dataset.del); save(); renderHistory(); }
    if (e.target.matches('[data-del-bm]')) { state.bookmarks = state.bookmarks.filter(h => h.url !== e.target.dataset.delBm); save(); renderBookmarks(); }
  });
});

function setZoom(v) {
  state.zoom = Math.min(150, Math.max(70, v));
  $('#zoomLabel').textContent = state.zoom + '%';
  $('#homeContent').style.zoom = state.zoom / 100;
}

function showPanel(name) {
  const content = $('#homeContent');
  const views = {
    Home: () => location.reload(),
    Tabs: () => `<h2 style="margin-bottom:16px">Open Tabs (${state.tabs.length})</h2>` + state.tabs.map(t => `<div class="list-row"><button class="row-main" data-url="${t.url}">${escapeHTML(t.title)}</button></div>`).join(''),
    History: () => '<h2 style="margin-bottom:16px">History</h2><div id="panel-history"></div>',
    Bookmarks: () => '<h2 style="margin-bottom:16px">Bookmarks</h2><div id="panel-bookmarks"></div>',
    Downloads: () => `<h2 style="margin-bottom:16px">Downloads</h2><p class="empty">No downloads yet.</p>`,
    Extensions: () => `<h2 style="margin-bottom:16px">Extensions</h2><p class="empty">Extensions support coming soon.</p>`,
    Settings: () => `<h2 style="margin-bottom:16px">Settings</h2><p style="margin-bottom:8px">Theme: ${state.settings.theme}</p><p style="margin-bottom:16px">Zoom: ${state.zoom}%</p><button onclick="localStorage.clear();location.reload()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer">Reset all</button>`
  };
  content.innerHTML = (views[name] || views.Home)();
  if (name === 'History') renderHistory();
  if (name === 'Bookmarks') renderBookmarks();
}