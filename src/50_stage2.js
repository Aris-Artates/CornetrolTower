/* ════════════════════════════════════════════════════════════════
   STAGE 2 — SECURITY CHECKPOINT (Layer 1 NAV & mouse + Layer 0)
   Real OS pointer (firmware mouse keys) tags contraband; names are
   typed on the base layer; containers drill the NAV arrow cluster;
   Ctrl+Z (NAV Undo) reverts mistags.
   ════════════════════════════════════════════════════════════════ */
const Stage2 = {
  def: null, lv: null,
  bags: [], queue: [], monitor: null, reportBar: null,
  raf: 0, lastT: 0, running: false, paused: false,
  timeLeft: 0, falseTags: 0, undoStack: [],
  redsTotal: 0, redsFiled: 0, nameKeys: 0, nameChars: 0,
  panelStack: [], report: null, bagsDone: 0, t0: 0,

  /* ── generation ──────────────────────────────────────────────── */
  makeItem(spec, red, container) {
    return { name: spec.name, glyph: spec.glyph, red, container: !!container,
             contents: [], filed: false, falseTagged: false, opened: false };
  },
  redPool() {
    const X = CONTENT.xray;
    return this.def.pool === 'long' ? X.redShort.concat(X.redLong) : X.redShort;
  },
  makeContainer(depth) {
    const X = CONTENT.xray;
    const c = this.makeItem(pick(X.containers), true, true);
    const n = irnd(3, 4);
    c.contents.push(this.makeItem(pick(this.redPool()), true));
    for (let i = 1; i < n; i++) {
      if (depth > 1 && i === 1 && Math.random() < 0.5) c.contents.push(this.makeContainer(depth - 1));
      else if (Math.random() < 0.35) c.contents.push(this.makeItem(pick(this.redPool()), true));
      else c.contents.push(this.makeItem(pick(X.safe), false));
    }
    c.contents = shuffle(c.contents);
    return c;
  },
  makeBag(i) {
    const X = CONTENT.xray;
    const items = [];
    const n = irnd(this.def.itemsPerBag[0], this.def.itemsPerBag[1]);
    const wantContainer = this.def.containerDepth > 0 && (i % 3 === 1);
    if (wantContainer) items.push(this.makeContainer(this.def.containerDepth));
    else {
      items.push(this.makeItem(pick(this.redPool()), true));
      if (this.lv.idx >= 1 && Math.random() < 0.35) items.push(this.makeItem(pick(this.redPool()), true));
    }
    while (items.length < n) {
      const safePool = this.def.lookalikes && Math.random() < 0.4 ? X.lookalikeSafe : X.safe;
      items.push(this.makeItem(pick(safePool), false));
    }
    const w = 150 + items.length * 34;
    return { items: shuffle(items), w, h: 128, x: 0, spawned: false, resolved: false, dom: null };
  },
  countReds(items) {
    let n = 0;
    items.forEach(it => { if (it.container) n += this.countReds(it.contents); else if (it.red) n++; });
    return n;
  },
  unfiledReds(items) {
    let n = 0;
    items.forEach(it => { if (it.container) n += this.unfiledReds(it.contents); else if (it.red && !it.filed) n++; });
    return n;
  },

  /* ── screen ──────────────────────────────────────────────────── */
  start(lv) {
    this.lv = lv; this.def = lv.def;
    const s = UI.clear(`${lv.def.id} · SECURITY CHECKPOINT`);
    const w = el('div', 'xr-wrap');
    w.append(el('div', 'xr-hud',
      `<span>BAGS <b id="x-bags">0/0</b></span><span>REDS <b id="x-reds">0/0</b></span>
       <span>FALSE <b id="x-false">0</b>/${this.def.maxFalse}</span>
       <span>NAMES <b id="x-nacc">100%</b></span><span>SHIFT <b id="x-time">–</b></span>`));
    this.monitor = el('div', 'xr-monitor');
    this.monitor.append(el('div', 'xr-belt'));
    w.append(this.monitor);
    this.reportBar = el('div', 'xr-report');
    this.reportBar.style.display = 'none';
    w.append(this.reportBar);
    s.append(w);

    this.bags = []; this.queue = [];
    for (let i = 0; i < this.def.bags; i++) this.queue.push(this.makeBag(i));
    this.redsTotal = this.queue.reduce((a, b) => a + this.countReds(b.items), 0);
    this.redsFiled = 0; this.falseTags = 0; this.undoStack = [];
    this.nameKeys = 0; this.nameChars = 0; this.bagsDone = 0;
    this.timeLeft = this.def.time; this.panelStack = []; this.report = null;
    this.running = false; this.paused = false;

    UI.setCleanup(() => { cancelAnimationFrame(this.raf); this.running = false; });
    this.guideBelt();
    UI.briefing(this.monitor, `Shift briefing — ${this.def.id} ${this.def.name}`, [
      'Bags cross the X-ray. <b>▲ red silhouettes are contraband</b>, ● white ones are safe.',
      'Hold <kbd>NAV</kbd> (left thumb) and steer the cursor with the mouse keys; <kbd>LC</kbd> left-clicks a red item to tag it.',
      'Tagging opens the report bar — type the item\'s exact name and press <kbd>Enter</kbd>.',
      'Red <b>containers</b> open an inspection panel: <kbd>↑</kbd>/<kbd>↓</kbd> (NAV on T/N) to move, <kbd>Enter</kbd> to report, <kbd>Esc</kbd> to close.',
      'Mistagged a safe item? <kbd>NAV</kbd>+<kbd>Undo</kbd> (Ctrl+Z) reverts it.',
      `Quota: ${this.def.bags} bags · every red reported · ≤${this.def.maxFalse} false tags.`
    ], 'Start shift', () => this.go());
  },

  go() {
    this.running = true;
    this.t0 = performance.now();
    this.lastT = this.t0;
    Keys.set({ capture: true, onKey: (e, editable) => this.onKey(e, editable) });
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (t - this.lastT) / 1000);
      this.lastT = t;
      this.tickBelt(dt);
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.fail('The shift timer ran out.'); return; }
      this.hud();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  hud() {
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('x-bags', `${this.bagsDone}/${this.def.bags}`);
    set('x-reds', `${this.redsFiled}/${this.redsTotal}`);
    set('x-false', this.falseTags);
    set('x-nacc', this.nameAcc() + '%');
    set('x-time', fmtTime(this.timeLeft));
  },
  nameAcc() { return this.nameKeys ? Math.min(100, Math.round(100 * this.nameChars / this.nameKeys)) : 100; },

  /* ── belt ────────────────────────────────────────────────────── */
  tickBelt(dt) {
    if (this.paused) return;
    const W = this.monitor.clientWidth;
    // spawn next bag when there is room
    const last = this.bags[this.bags.length - 1];
    if (this.queue.length && (!last || last.x + last.w < W - 70)) {
      const b = this.queue.shift();
      b.x = W + 10;
      this.spawnBag(b);
      this.bags.push(b);
    }
    for (const b of this.bags) {
      if (b.resolved) continue;
      b.x -= this.def.beltSpeed * dt;
      b.dom.style.left = b.x + 'px';
      if (b.x + b.w < -8) {
        b.resolved = true;
        this.bagsDone++;
        b.dom.remove();
        const missed = this.unfiledReds(b.items);
        if (missed > 0) { this.fail(`A red item slipped through in that bag (${missed} unreported).`); return; }
        if (this.bagsDone >= this.def.bags) { this.finish(); return; }
      }
    }
  },
  spawnBag(bag) {
    const beltTop = this.monitor.clientHeight - 26;
    const d = el('div', 'bag');
    d.style.width = bag.w + 'px'; d.style.height = bag.h + 'px';
    d.style.top = (beltTop - bag.h - 2) + 'px'; d.style.left = bag.x + 'px';
    d.append(el('div', 'bagtag', 'BAG ' + irnd(100, 999)));
    const cols = bag.items.length;
    bag.items.forEach((it, i) => {
      const x = 10 + i * ((bag.w - 46) / Math.max(1, cols - 1) || 0);
      const y = 18 + (i % 2) * 44 + irnd(-6, 6);
      d.append(this.itemDom(it, x, Math.min(y, bag.h - 52)));
    });
    bag.dom = d;
    this.monitor.append(d);
  },
  itemDom(it, x, y) {
    const d = el('div', 'xitem ' + (it.red ? 'red' : 'safe'),
      `<span class="glyph">${it.glyph}</span><span class="badge">${it.red ? '▲' : '●'}</span>`);
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.onclick = (ev) => { ev.stopPropagation(); this.clickItem(it, d); };
    it.dom = d;
    return d;
  },

  /* ── tagging & reports ───────────────────────────────────────── */
  clickItem(it, dom) {
    if (!this.running || this.report || this.panelStack.length) return;
    if (it.filed || it.falseTagged) return;
    if (!it.red) {
      it.falseTagged = true;
      dom.classList.add('falsetag');
      this.falseTags++;
      this.undoStack.push(it);
      Sound.buzz();
      Guide.forKeyName('Undo');
      UI.toast('False alarm! NAV + Undo (Ctrl+Z) reverts it.');
      return;
    }
    Sound.blip();
    if (it.container) { it.opened = true; this.openPanel(it); return; }
    this.openReport(it);
  },
  undo() {
    const it = this.undoStack.pop();
    if (!it) return;
    it.falseTagged = false;
    if (it.dom) it.dom.classList.remove('falsetag');
    this.falseTags--;
    Sound.good();
    UI.toast('Mistag reverted.');
    this.guideBelt();
  },

  openReport(it) {
    this.paused = true;
    this.report = { item: it };
    this.reportBar.style.display = 'flex';
    this.reportBar.innerHTML = `<span style="color:var(--red)">▲ REPORT:</span>
      <span>${it.glyph}</span><input type="text" spellcheck="false" autocomplete="off">
      <span class="subtle" style="font-size:12px">type the exact name · Enter files · Esc cancels</span>`;
    const inp = this.reportBar.querySelector('input');
    inp.addEventListener('keydown', (e) => {
      if (e.key.length === 1 || e.key === 'Backspace') this.nameKeys++;
    });
    inp.addEventListener('input', () => this.guideName(it.name, inp.value));
    inp.focus();
    this.guideName(it.name, '');
  },
  submitReport() {
    const inp = this.reportBar.querySelector('input');
    const it = this.report.item;
    if (inp.value.trim().toLowerCase() === it.name.toLowerCase()) {
      it.filed = true;
      this.nameChars += it.name.length;
      if (it.dom) it.dom.classList.add('tagged');
      this.redsFiled++;
      Sound.good();
      this.closeReport();
    } else { Sound.buzz(); inp.select(); }
  },
  closeReport() {
    this.report = null;
    this.reportBar.style.display = 'none';
    this.paused = this.panelStack.length > 0;
    this.guideBelt();
  },

  /* ── container inspection panel ──────────────────────────────── */
  openPanel(container) {
    this.paused = true;
    const p = { container, sel: 0, typing: null, dom: null };
    this.panelStack.push(p);
    this.renderPanel();
    this.guidePanel();
  },
  topPanel() { return this.panelStack[this.panelStack.length - 1]; },
  renderPanel() {
    this.panelStack.forEach(p => { if (p.dom) p.dom.remove(); });
    const p = this.topPanel();
    if (!p) return;
    const c = p.container;
    const d = el('div', 'xr-panel');
    d.append(el('h4', null, `${c.glyph} ${esc(c.name)} — contents`));
    c.contents.forEach((it, i) => {
      const cls = ['entry', it.red ? 'redE' : 'safeE', it.filed ? 'doneE' : '', i === p.sel ? 'sel' : ''].join(' ');
      const e = el('div', cls,
        `<span class="eglyph">${it.glyph}</span><span>${it.red ? '▲' : '●'}</span>
         <span class="ename">${esc(it.name)}${it.container ? ' (container)' : ''}</span>`);
      if (i === p.sel && p.typing !== null) {
        const inp = el('input');
        inp.type = 'text'; inp.spellcheck = false;
        inp.value = p.typing;
        e.append(inp);
        setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
        inp.addEventListener('keydown', (ev) => {
          if (ev.key.length === 1 || ev.key === 'Backspace') this.nameKeys++;
        });
        inp.addEventListener('input', () => { p.typing = inp.value; this.guideName(it.name, inp.value); });
      }
      d.append(e);
    });
    d.append(el('div', 'phint', '↑/↓ move (NAV on T/N) · Enter report red · Esc close'));
    p.dom = d;
    this.monitor.append(d);
  },
  panelKey(e) {
    const p = this.topPanel();
    const c = p.container;
    const it = c.contents[p.sel];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (p.typing !== null) return true;   // finish or Esc the name first
      p.sel = (p.sel + (e.key === 'ArrowDown' ? 1 : c.contents.length - 1)) % c.contents.length;
      Sound.blip();
      this.renderPanel(); this.guidePanel();
      return true;
    }
    if (e.key === 'Enter') {
      if (p.typing !== null) {              // submit typed name
        if (p.typing.trim().toLowerCase() === it.name.toLowerCase()) {
          it.filed = true;
          this.nameChars += it.name.length;
          this.redsFiled++;
          p.typing = null;
          Sound.good();
        } else Sound.buzz();
        this.renderPanel(); this.guidePanel();
        return true;
      }
      if (it.container && !it.filed) { it.opened = true; Sound.blip(); this.openPanel(it); return true; }
      if (it.red && !it.filed) { p.typing = ''; this.renderPanel(); this.guideName(it.name, ''); return true; }
      Sound.buzz();                          // white entry: skip it
      return true;
    }
    if (e.key === 'Escape') {
      if (p.typing !== null) { p.typing = null; this.renderPanel(); this.guidePanel(); return true; }
      p.dom.remove();
      this.panelStack.pop();
      if (this.panelStack.length) { this.renderPanel(); this.guidePanel(); }
      else { this.paused = !!this.report; this.guideBelt(); }
      Sound.blip();
      return true;
    }
    return false;
  },

  /* ── input ───────────────────────────────────────────────────── */
  onKey(e, editable) {
    if (!this.running) return false;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' || e.key === 'Undo') {
      if (!this.report && !this.panelStack.length) { this.undo(); return true; }
      return true;   // swallow while a form is open
    }
    if (this.panelStack.length) return this.panelKey(e);
    if (this.report) {
      if (e.key === 'Enter') { this.submitReport(); return true; }
      if (e.key === 'Escape') { this.closeReport(); return true; }
      return false;  // let chars flow into the input
    }
    return false;
  },

  /* ── guide states ────────────────────────────────────────────── */
  guideBelt() {
    Guide.forCluster(1, ['MU', 'MD', 'ML', 'MR', 'LC'],
      'Hold NAV (left thumb) · MU/MD/ML/MR steer the cursor · LC (left click) tags a ▲ red item');
  },
  guidePanel() {
    Guide.forCluster(1, ['ArrowUp', 'ArrowDown'],
      'Hold NAV · ↑/↓ on T & N move the list · Enter reports a ▲ entry · Esc closes');
  },
  guideName(target, typed) {
    let i = 0;
    while (i < typed.length && i < target.length && typed[i] === target[i]) i++;
    if (typed === target) Guide.forKeyName('Enter', 'Ent — file the report');
    else if (i < typed.length) Guide.forKeyName('Backspace', 'Bsp — fix the name');
    else Guide.forChar(target[i], target[i] === ' ' ? 'Space' : undefined);
  },

  /* ── endings ─────────────────────────────────────────────────── */
  elapsed() { return (performance.now() - this.t0) / 1000; },
  fail(note) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    Save.record(this.def.id, false, null, 'time', true);
    UI.results({
      levelId: this.def.id, passed: false, failNote: note,
      rows: [['Bags cleared', `${this.bagsDone}/${this.def.bags}`], ['Reds reported', `${this.redsFiled}/${this.redsTotal}`],
             ['False tags', this.falseTags], ['Name accuracy', this.nameAcc() + '%']],
      onRetry: () => this.start(this.lv)
    });
  },
  finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    const time = this.elapsed();
    const nameAcc = this.nameAcc();
    const passed = this.falseTags <= this.def.maxFalse && nameAcc >= this.def.nameAcc;
    const stats = { time: Math.round(time), falseTags: this.falseTags, nameAcc };
    Save.record(this.def.id, passed, stats, 'time', true);
    UI.results({
      levelId: this.def.id, passed,
      failNote: passed ? null : (this.falseTags > this.def.maxFalse ? 'Too many false tags.' : 'Item names typed too sloppily.'),
      rows: [['Shift time', fmtTime(time)], ['Reds reported', `${this.redsFiled}/${this.redsTotal}`],
             ['False tags', `${this.falseTags} (max ${this.def.maxFalse})`], ['Name accuracy', `${nameAcc}% (min ${this.def.nameAcc}%)`]],
      onRetry: () => this.start(this.lv)
    });
  }
};
