/* ════════════════════════════════════════════════════════════════
   STAGE 1 — FLIGHT SCHOOL (Layer 0, Dvorak base)
   warm-up (untimed) → practice (scored) → test (gated)
   ════════════════════════════════════════════════════════════════ */
const Stage1 = {
  lv: null, def: null, phase: 'warmup',
  tokens: [], idx: 0, errors: 0, keystrokes: 0, t0: 0, wrongBuf: [],
  timer: null, textEl: null, run: false,

  taughtPool(uptoIdx) {
    let pool = [];
    for (let i = 0; i <= uptoIdx; i++) pool = pool.concat(CONFIG.stage1[i].newKeys.filter(k => k.length === 1));
    return pool;
  },

  /* ── token generation ─────────────────────────────────────────── */
  strToTokens(str) {
    const out = [];
    for (const ch of str) {
      if (ch === '\t') out.push({ key: 'Tab', label: '⇥ TAB' });
      else if (ch === '\x1b') out.push({ key: 'Escape', label: '⎋ ESC' });
      else if (ch === '\n') out.push({ key: 'Enter', label: '⏎' });
      else out.push({ ch });
    }
    return out;
  },
  generate(kind, chars) {
    const C = CONTENT;
    const words = (poolFn) => {
      let s = '';
      while (s.length < chars) s += (s ? ' ' : '') + poolFn();
      return this.strToTokens(s);
    };
    if (kind === 'bursts') {
      const L = ['a','o','e','u','i'], R = ['d','h','t','n','s'];
      let parts = shuffle(C.homeLetters).concat(shuffle(C.homeLetters));      // singles
      for (let i = 0; i < 10; i++) parts.push(pick(L) + pick(R), pick(R) + pick(L)); // alternating pairs
      let s = parts.join(' ');
      while (s.length < chars) {                                              // 3–5 key bursts
        let b = ''; const n = irnd(3, 5);
        for (let i = 0; i < n; i++) b += pick(C.homeLetters);
        s += ' ' + b;
      }
      return this.strToTokens(s.slice(0, chars + 6));
    }
    if (kind === 'homeWords') return words(() => pick(C.homeWords));
    if (kind === 'topWords') return words(() => {
      const r = Math.random();
      return r < 0.3 ? pick(C.homeWords) : r < 0.85 ? pick(C.topWords) : pick(C.topPunct);
    });
    if (kind === 'botWords') return words(() => {
      const r = Math.random();
      const w = r < 0.25 ? pick(C.homeWords) : r < 0.5 ? pick(C.topWords) : pick(C.botWords);
      return Math.random() < 0.12 ? w + ';' : w;
    });
    if (kind === 'pangrams') {
      let s = '';
      const bag = shuffle(C.pangrams);
      let i = 0;
      while (s.length < chars) s += (s ? ' ' : '') + bag[i++ % bag.length];
      return this.strToTokens(s);
    }
    // exam: prose lines with Tab/Esc tokens, Enter closing each line
    let toks = [];
    const bag = shuffle(C.examLines);
    let i = 0, count = 0;
    while (count < chars) {
      const line = bag[i++ % bag.length];
      const t = this.strToTokens(line);
      t.push({ key: 'Enter', label: '⏎' });
      toks = toks.concat(t);
      count += line.length + 1;
    }
    return toks;
  },
  warmupTokens() {
    const keys = this.def.newKeys.length ? this.def.newKeys
      : (this.lv.idx === 1 ? CONTENT.homeWords.slice(0, 8).join(' ').split('') : CONTENT.homeLetters);
    const out = [];
    keys.forEach(k => {
      for (let r = 0; r < 2; r++) {
        if (k.length === 1) out.push({ ch: k });
        else out.push({ key: k, label: k === 'Tab' ? '⇥ TAB' : k === 'Escape' ? '⎋ ESC' : k });
        out.push({ ch: ' ' });
      }
    });
    out.pop();
    return out;
  },

  /* ── screen ───────────────────────────────────────────────────── */
  start(lv) {
    this.lv = lv; this.def = lv.def;
    const s = UI.clear(`${lv.def.id} · ${lv.def.name.toUpperCase()}`);
    const w = el('div', 't-stage');
    w.append(el('h2', 'board', `${this.def.id} — ${this.def.name}`));
    w.append(el('div', 'subtle', `Gate: ${gateSummary(this.def.id)} · measured over the keys taught so far`));
    const phaseRow = el('div', 't-phase');
    ['warmup', 'practice', 'test'].forEach(p => {
      const b = el('button', 'btn', { warmup: 'Warm-up', practice: 'Practice run', test: 'Test run' }[p]);
      b.dataset.phase = p;
      b.onclick = () => this.begin(p);
      phaseRow.append(b);
    });
    const restart = el('button', 'btn', '↻ Restart');
    restart.onclick = () => this.begin(this.phase);
    phaseRow.append(restart);
    w.append(phaseRow);
    w.append(el('div', 't-meters',
      `<span>WPM <b id="m-wpm">–</b></span><span>ACC <b id="m-acc">–</b></span>
       <span>PROGRESS <b id="m-prog">0%</b></span><span id="m-phase" style="color:var(--amber)"></span>`));
    this.textEl = el('div', 't-text');
    w.append(this.textEl);
    w.append(el('div', 't-note', 'Errors buzz and hold the cursor. In strict levels (1-5+) wrong keys land in the buffer — fix them with Backspace (left thumb).'));
    s.append(w);
    UI.setCleanup(() => { clearInterval(this.timer); this.run = false; });
    this.begin('warmup');
  },

  begin(phase) {
    this.phase = phase;
    document.querySelectorAll('.t-phase .btn').forEach(b =>
      b.classList.toggle('on', b.dataset.phase === phase));
    const chars = phase === 'practice' ? Math.round(this.def.testChars * 0.6) : this.def.testChars;
    this.tokens = phase === 'warmup' ? this.warmupTokens() : this.generate(this.def.gen, chars);
    this.idx = 0; this.errors = 0; this.keystrokes = 0; this.t0 = 0; this.wrongBuf = []; this.run = true;
    document.getElementById('m-phase').textContent =
      { warmup: 'WARM-UP — untimed, follow the guide', practice: 'PRACTICE — scored, no gate', test: 'TEST — gate applies' }[phase];
    clearInterval(this.timer);
    this.timer = setInterval(() => this.meters(), 400);
    this.renderText();
    this.hint();
    Keys.set({ capture: true, onKey: (e) => this.onKey(e) });
  },

  hint() {
    const t = this.tokens[this.idx];
    if (!t) return;
    if (this.wrongBuf.length) { Guide.forKeyName('Backspace', 'Bsp'); return; }
    if (t.ch) Guide.forChar(t.ch === ' ' ? ' ' : t.ch, t.ch === ' ' ? 'Space' : undefined);
    else Guide.forKeyName(t.key);
  },

  onKey(e) {
    if (!this.run) return false;
    const k = e.key;
    if (['Shift','Control','Alt','Meta','CapsLock','NumLock'].includes(k)) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const tok = this.tokens[this.idx];
    if (!tok) return false;

    if (this.def.strict && this.phase !== 'warmup') {
      if (k === 'Backspace') {
        if (this.wrongBuf.length) { this.wrongBuf.pop(); Sound.tick(); }
        this.renderText(); this.hint(); return true;
      }
      if (this.wrongBuf.length) {                       // buffer dirty: everything else piles on
        if (k.length === 1 || ['Tab','Enter','Escape'].includes(k)) {
          if (this.wrongBuf.length < 8) this.wrongBuf.push(k.length === 1 ? k : '⌧');
          this.errors++; this.keystrokes++; Sound.buzz();
          this.renderText(); this.meters();
        }
        return true;
      }
    }
    const want = tok.ch !== undefined ? tok.ch : tok.key;
    const got = tok.ch !== undefined ? (k.length === 1 ? k : null) : k;
    if (got === null && k !== 'Backspace' && !['Tab','Enter','Escape'].includes(k)) return false;
    if (!this.t0 && this.phase !== 'warmup') this.t0 = performance.now();
    this.keystrokes++;
    if (got === want) {
      this.idx++;
      Sound.tick();
      if (this.idx >= this.tokens.length) { this.finish(); return true; }
      this.renderText(); this.hint(); this.meters();
    } else {
      this.errors++;
      Sound.buzz();
      if (this.def.strict && this.phase !== 'warmup' && (k.length === 1 || ['Tab','Enter','Escape'].includes(k))) {
        this.wrongBuf.push(k.length === 1 ? k : '⌧');
      }
      this.renderText(); this.hint(); this.meters();
    }
    return true;
  },

  renderText() {
    const frag = document.createDocumentFragment();
    this.tokens.forEach((t, i) => {
      let cls = 'tok', body;
      if (t.ch !== undefined) {
        body = t.ch;
        if (i === this.idx && t.ch === ' ') body = '␣';
      } else { cls += ' special'; body = t.label || t.key; }
      if (i < this.idx) cls += ' done';
      if (i === this.idx && !this.wrongBuf.length) cls += ' cur';
      if (i === this.idx) {
        this.wrongBuf.forEach(wc => frag.append(el('span', 'tok wrongchar', esc(wc === ' ' ? '␣' : wc))));
        if (this.wrongBuf.length) cls += ' err';
      }
      frag.append(el('span', cls, esc(body)));
      if (t.key === 'Enter') frag.append(document.createTextNode('\n'));
    });
    this.textEl.innerHTML = '';
    this.textEl.append(frag);
    const cur = this.textEl.querySelector('.cur, .wrongchar');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  },

  stats() {
    const mins = this.t0 ? (performance.now() - this.t0) / 60000 : 0;
    const wpm = mins > 0 ? Math.round((this.idx / 5) / mins) : 0;
    const acc = this.keystrokes ? Math.round(100 * Math.max(0, this.keystrokes - this.errors) / this.keystrokes) : 100;
    return { wpm, acc, mins };
  },
  meters() {
    const { wpm, acc } = this.stats();
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('m-wpm', this.phase === 'warmup' ? '–' : wpm);
    set('m-acc', acc + '%');
    set('m-prog', Math.round(100 * this.idx / this.tokens.length) + '%');
  },

  finish() {
    this.run = false;
    clearInterval(this.timer);
    Keys.clear();
    const { wpm, acc } = this.stats();
    if (this.phase === 'warmup') {
      Sound.good();
      UI.toast('Warm-up done — moving to the practice run.');
      this.begin('practice');
      return;
    }
    if (this.phase === 'practice') {
      Sound.good();
      UI.toast(`Practice: ${wpm} WPM @ ${acc}% — take the test when ready.`);
      this.begin('test');
      return;
    }
    const g = this.def.gate;
    const passed = wpm >= g.wpm && acc >= g.acc;
    Save.record(this.def.id, passed, { wpm, acc }, 'wpm', false);
    UI.results({
      levelId: this.def.id, passed,
      rows: [['Speed', wpm + ' WPM'], ['Accuracy', acc + '%'], ['Errors', this.errors], ['Keystrokes', this.keystrokes]],
      onRetry: () => this.begin('test')
    });
  }
};
