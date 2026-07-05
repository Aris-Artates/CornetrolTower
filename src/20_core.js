/* ════════════════════════════════════════════════════════════════
   CORE — helpers, save data, audio, key capture, UI plumbing.
   ════════════════════════════════════════════════════════════════ */
function el(tag, cls, html) {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0'); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ── Level registry ─────────────────────────────────────────────── */
const LEVELS = (() => {
  const list = [];
  [CONFIG.stage1, CONFIG.stage2, CONFIG.stage3, CONFIG.stage4].forEach((arr, si) =>
    arr.forEach((def, li) => list.push({ id: def.id, stage: si + 1, idx: li, def })));
  return list;
})();
function levelAt(id) { return LEVELS.find(l => l.id === id); }
function prevLevelId(id) { const i = LEVELS.findIndex(l => l.id === id); return i > 0 ? LEVELS[i - 1].id : null; }
function nextLevelId(id) { const i = LEVELS.findIndex(l => l.id === id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1].id : null; }
function gateSummary(id) {
  const { stage, def } = levelAt(id);
  if (stage === 1) return `${def.gate.wpm} WPM @ ${def.gate.acc}%`;
  if (stage === 2) return `all reds · ≤${def.maxFalse} false tags · names ≥${def.nameAcc}% · ${fmtTime(def.time)}`;
  if (stage === 3) return `all tickets exact · first-pass ≥${def.firstPass}% · ${fmtTime(def.time)}`;
  return `land ${def.land} · ≤${def.maxWrong} wrong picks · zero fuel-outs`;
}

/* ── Save / progress ───────────────────────────────────────────── */
const Save = {
  canStore: true,
  data: null,
  load() {
    const fresh = { settings: { ...CONFIG.audio, guideOpen: true }, unlockAll: false, levels: {} };
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      this.data = raw ? Object.assign(fresh, JSON.parse(raw)) : fresh;
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data));
    } catch (e) { this.canStore = false; this.data = fresh; }
  },
  persist() {
    if (!this.canStore) return;
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data)); } catch (e) { this.canStore = false; }
  },
  rec(id) { return this.data.levels[id] || null; },
  passed(id) { const r = this.rec(id); return !!(r && r.passed); },
  isUnlocked(id) {
    if (this.data.unlockAll) return true;
    const prev = prevLevelId(id);
    return prev === null || this.passed(prev);
  },
  // record a run; keep the best passed run's stats (primary: higher is better unless timeBased)
  record(id, passed, stats, primary, timeBased) {
    const cur = this.data.levels[id] || {};
    cur.passed = cur.passed || passed;
    if (passed) {
      const old = cur.best;
      const better = !old || (timeBased ? stats[primary] < old[primary] : stats[primary] > old[primary]);
      if (better) cur.best = stats;
    }
    this.data.levels[id] = cur;
    this.persist();
  }
};

/* ── Audio (WebAudio; obeys Settings volumes) ───────────────────── */
const Sound = {
  ctx: null, masterG: null, musicG: null, sfxG: null, musicTimer: null,
  ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterG = this.ctx.createGain(); this.masterG.connect(this.ctx.destination);
      this.musicG = this.ctx.createGain(); this.musicG.connect(this.masterG);
      this.sfxG = this.ctx.createGain(); this.sfxG.connect(this.masterG);
      this.applyVolumes();
    } catch (e) { return false; }
    return true;
  },
  applyVolumes() {
    if (!this.ctx) return;
    const s = Save.data.settings;
    this.masterG.gain.value = s.master;
    this.musicG.gain.value = s.music;
    this.sfxG.gain.value = s.sfx;
  },
  tone(freq, dur, type, vol, dest, when) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime + (when || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxG); o.start(t); o.stop(t + dur + 0.02);
  },
  tick()  { this.tone(1700, 0.045, 'square', 0.12); },
  buzz()  { this.tone(130, 0.18, 'sawtooth', 0.22); this.tone(98, 0.22, 'sawtooth', 0.15, null, 0.02); },
  good()  { this.tone(880, 0.09, 'sine', 0.18); this.tone(1320, 0.12, 'sine', 0.15, null, 0.07); },
  blip()  { this.tone(520, 0.06, 'triangle', 0.14); },
  jingle() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.18, null, i * 0.11));
  },
  musicStart() {
    if (!this.ensure() || this.musicTimer) return;
    const chords = [[196, 247, 294], [175, 220, 262], [147, 196, 247], [165, 208, 262]];
    let bar = 0;
    const playBar = () => {
      const c = chords[bar % chords.length]; bar++;
      c.forEach(f => this.tone(f, 3.6, 'sine', 0.045, this.musicG));
      this.tone(pick(c) * 2, 0.5, 'triangle', 0.035, this.musicG, rnd(0.5, 2.5));
    };
    playBar();
    this.musicTimer = setInterval(playBar, 4000);
  },
  musicStop() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } }
};

/* ── Global key capture (ground rule 3) ─────────────────────────── */
const Keys = {
  ctx: null,   // { onKey(e, editable) -> true if consumed, capture: true }
  set(c) { this.ctx = c; },
  clear() { this.ctx = null; },
  install() {
    document.addEventListener('keydown', (e) => {
      Sound.ensure();
      if (e.defaultPrevented) return;         // an element handler already dealt with it
      const c = this.ctx;
      if (!c) return;
      const t = e.target;
      const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (c.onKey && c.onKey(e, editable)) { e.preventDefault(); return; }
      if (!c.capture) return;
      const k = e.key;
      // keys browsers normally steal: Tab, F1–F12, Esc — always; quick-find
      // chars, Space-scroll, Backspace-nav, arrows/paging — outside inputs.
      if (k === 'Tab' || k === 'Escape' || /^F\d{1,2}$/.test(k)) { e.preventDefault(); return; }
      if (!editable && (k === "'" || k === '/' || k === ' ' || k === 'Backspace'
          || k.startsWith('Arrow') || k === 'Home' || k === 'End' || k === 'PageUp' || k === 'PageDown')) {
        e.preventDefault();
      }
    });
    document.addEventListener('pointerdown', () => Sound.ensure(), { once: true });
  }
};

/* ── UI plumbing ────────────────────────────────────────────────── */
const UI = {
  screenEl: null, topbarEl: null, toastEl: null,
  cleanup: null,
  init() {
    this.screenEl = document.getElementById('screen');
    this.topbarEl = document.getElementById('topbar');
    this.toastEl = document.getElementById('toast');
  },
  setCleanup(fn) { this.cleanup = fn; },
  clear(crumb, hud) {
    if (this.cleanup) { try { this.cleanup(); } catch (e) {} this.cleanup = null; }
    Keys.clear();
    this.screenEl.innerHTML = '';
    this.topbar(crumb, hud);
    return this.screenEl;
  },
  topbar(crumb, hud) {
    this.topbarEl.innerHTML = '';
    const back = el('button', 'btn', '◂ Menu');
    back.style.padding = '3px 12px'; back.style.fontSize = '12px';
    back.onclick = () => Screens.menu();
    this.topbarEl.append(back, el('span', 'brand', 'Corne-troll Tower'),
      el('span', 'crumb', esc(crumb || '')), el('span', 'spacer'));
    this.hudEl = el('div', 'hud', hud || '');
    this.topbarEl.append(this.hudEl);
  },
  hud(html) { if (this.hudEl) this.hudEl.innerHTML = html; },
  toast(msg) {
    const t = el('div', 'toast', esc(msg));
    this.toastEl.append(t);
    setTimeout(() => t.remove(), 3200);
  },
  modal(html) {
    const veil = el('div', 'modal-veil');
    const box = el('div', 'modal', html);
    veil.append(box);
    document.body.append(veil);
    return { veil, box, close: () => veil.remove() };
  },
  results({ levelId, passed, rows, onRetry, onNext, failNote }) {
    Keys.clear();
    const gate = gateSummary(levelId);
    const rowsHtml = rows.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
    const m = this.modal(
      `<h3 class="${passed ? 'pass' : 'fail'}">${passed ? '■ SHIFT CLEARED' : '■ NOT YET'}</h3>
       ${failNote ? `<div style="color:var(--red);font-size:13px;margin-bottom:8px">${esc(failNote)}</div>` : ''}
       <div class="statrows">${rowsHtml}</div>
       <div class="gate-note">Gate: ${esc(gate)}</div>
       <div class="acts"></div>`);
    const acts = m.box.querySelector('.acts');
    const retry = el('button', 'btn', 'Retry');
    retry.onclick = () => { m.close(); onRetry(); };
    const sel = el('button', 'btn', 'Level select');
    sel.onclick = () => { m.close(); Screens.levels(levelAt(levelId).stage); };
    acts.append(retry, sel);
    if (passed) {
      const nid = nextLevelId(levelId);
      const next = el('button', 'btn primary', nid ? `Next: ${nid} ▸` : 'Career complete!');
      next.onclick = () => { m.close(); if (nid) Screens.play(nid); else Screens.stages(); };
      acts.append(next);
      Sound.jingle();
    } else {
      Sound.buzz();
    }
  },
  // standard pre-level briefing overlay; host = positioned container
  briefing(host, title, lines, startLabel, onStart) {
    const veil = el('div', 'brief-veil');
    const box = el('div', 'briefing',
      `<h3>${esc(title)}</h3><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`);
    const b = el('button', 'btn primary', startLabel || 'Start shift');
    b.onclick = () => { veil.remove(); onStart(); };
    box.append(b);
    veil.append(box);
    host.append(veil);
    setTimeout(() => b.focus(), 30);
  }
};
