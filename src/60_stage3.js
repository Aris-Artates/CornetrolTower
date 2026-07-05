/* ════════════════════════════════════════════════════════════════
   STAGE 3 — MAINTENANCE BAY (Layer 2 SYM + Layers 0 & 1)
   Mini fake IDE: file tree, tabbed panes, live char-diff against
   the ticket target, and a fake terminal. Nothing executes —
   correctness is buffer vs target.
   ════════════════════════════════════════════════════════════════ */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

const Stage3 = {
  lv: null, def: null, content: null,
  filesState: {}, panes: [], zone: 0, ticketIdx: 0,
  termNeeded: [], termProgress: 0,
  keystrokes: 0, corrections: 0, minSum: 0,
  fpGood: 0, fpBad: 0, lineTouched: {}, lineEvaluated: {},
  timeLeft: 0, timer: null, running: false,
  treeEl: null, centerEl: null, ticketEl: null, targetEl: null, termOut: null, termIn: null,

  norm(s) { return s.split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, ''); },
  ticket() { return this.content.tickets[this.ticketIdx] || null; },

  start(lv) {
    this.lv = lv; this.def = lv.def;
    this.content = TICKETS[this.def.id];
    this.filesState = { ...this.content.files };
    this.panes = []; this.zone = 0; this.ticketIdx = 0;
    this.keystrokes = 0; this.corrections = 0; this.minSum = 0;
    this.fpGood = 0; this.fpBad = 0;
    this.timeLeft = this.def.time; this.running = false;

    const s = UI.clear(`${this.def.id} · MAINTENANCE BAY`);
    const grid = el('div', 'ide');
    this.treeEl = el('div', 'tree');
    this.centerEl = el('div', 'center');
    const tcol = el('div', 'ticketcol');
    this.ticketEl = el('div', 'ticket');
    this.targetEl = el('div', 'targetview');
    tcol.append(this.ticketEl, this.targetEl);
    const term = el('div', 'term');
    this.termOut = el('div', 'tout', 'MAINT-BAY OS — fake terminal. PgDn cycles pane → terminal.\n');
    const tline = el('div', 'tline', '<span style="color:var(--green)">$</span>');
    this.termIn = el('input');
    this.termIn.spellcheck = false;
    tline.append(this.termIn);
    term.append(this.termOut, tline);
    this.termEl = term;
    grid.append(this.treeEl, this.centerEl, tcol, term);
    s.append(grid);

    this.addPane();
    this.renderTree();

    this.termIn.addEventListener('keydown', (e) => {
      this.countKey(e);
      if (e.key === 'Enter') { this.runCmd(this.termIn.value); this.termIn.value = ''; e.preventDefault(); }
    });
    this.termIn.addEventListener('input', () => this.guideTerminal());
    this.termIn.addEventListener('focus', () => this.setZone(this.panes.length));

    UI.setCleanup(() => { clearInterval(this.timer); this.running = false; });
    UI.briefing(s, `Work order — ${this.def.id} ${this.def.name}`, [
      'Reproduce each ticket\'s target code <b>exactly</b> — mismatching lines glow red in your buffer.',
      'Hold <kbd>SYM</kbd> (right thumb) for symbols: openers <kbd>( { [</kbd> sit on the LEFT home row, closers <kbd>) } ]</kbd> mirror on the RIGHT.',
      'Select with home-row-mod Shift (<kbd>U</kbd>/<kbd>H</kbd>) + NAV arrows / Home / End. Copy, Cut, Paste and Undo live on the NAV layer.',
      '<kbd>PgUp</kbd>/<kbd>PgDn</kbd> (NAV) cycle pane → split → terminal. Click works too. <kbd>Tab</kbd> indents 4 spaces.',
      `Timer: ${fmtTime(this.def.time)} · first-pass line accuracy gate: ${this.def.firstPass}%.`
    ], 'Clock in', () => {
      this.running = true;
      Keys.set({ capture: true, onKey: (e, ed) => this.onKey(e, ed) });
      this.timer = setInterval(() => {
        this.timeLeft -= 0.5;
        if (this.timeLeft <= 0) this.fail('The shift timer ran out.');
        this.hud();
      }, 500);
      this.setTicket(0);
    });
  },

  /* ── panes & files ───────────────────────────────────────────── */
  addPane() {
    const idx = this.panes.length;
    const dom = el('div', 'pane');
    const tabsEl = el('div', 'tabs');
    const wrap = el('div', 'edwrap');
    const pre = el('pre');
    const ta = document.createElement('textarea');
    ta.spellcheck = false; ta.wrap = 'off';
    wrap.append(pre, ta);
    dom.append(tabsEl, wrap);
    this.centerEl.append(dom);
    const pane = { idx, dom, tabsEl, ta, pre, tabs: [], active: null, lastLine: null };
    this.panes.push(pane);

    ta.addEventListener('keydown', (e) => {
      this.countKey(e);
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!document.execCommand('insertText', false, '    ')) {
          const st = ta.selectionStart;
          ta.value = ta.value.slice(0, st) + '    ' + ta.value.slice(ta.selectionEnd);
          ta.setSelectionRange(st + 4, st + 4);
          ta.dispatchEvent(new Event('input'));
        }
      }
    });
    ta.addEventListener('input', () => {
      if (!pane.active) { ta.value = ''; return; }
      this.filesState[pane.active] = ta.value;
      const line = this.caretLine(ta);
      this.lineTouched[pane.active + ':' + line] = true;
      this.renderDiff(pane);
      this.guideDiff();
      this.checkTicket();
    });
    const caretWatch = () => this.trackCaret(pane);
    ta.addEventListener('keyup', caretWatch);
    ta.addEventListener('click', caretWatch);
    ta.addEventListener('focus', () => this.setZone(idx));
    ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; });
    this.renderTabs(pane);
    return pane;
  },
  caretLine(ta) { return ta.value.slice(0, ta.selectionStart).split('\n').length - 1; },
  trackCaret(pane) {
    if (!pane.active) return;
    const line = this.caretLine(pane.ta);
    if (pane.lastLine !== null && line !== pane.lastLine) this.evalLine(pane, pane.lastLine);
    pane.lastLine = line;
  },
  evalLine(pane, lineNo) {
    const t = this.ticket();
    if (!t || !t.file || pane.active !== t.file) return;
    const key = pane.active + ':' + lineNo;
    if (!this.lineTouched[key] || this.lineEvaluated[key]) return;
    this.lineEvaluated[key] = true;
    const cur = (this.filesState[pane.active] || '').split('\n')[lineNo] || '';
    const tgt = t.after.split('\n')[lineNo];
    if (tgt !== undefined && cur.replace(/\s+$/, '') === tgt.replace(/\s+$/, '')) this.fpGood++;
    else this.fpBad++;
    this.hud();
  },
  openFile(name, paneIdx) {
    const pane = this.panes[paneIdx === undefined ? Math.min(this.zone, this.panes.length - 1) : paneIdx];
    if (!pane.tabs.includes(name)) pane.tabs.push(name);
    pane.active = name;
    pane.ta.value = this.filesState[name];
    pane.lastLine = null;
    this.renderTabs(pane);
    this.renderTree();
    this.renderDiff(pane);
  },
  renderTabs(pane) {
    pane.tabsEl.innerHTML = '';
    if (!pane.tabs.length) pane.tabsEl.append(el('span', 'tab', 'no file — click one in the tree'));
    pane.tabs.forEach(name => {
      const t = el('span', 'tab' + (pane.active === name ? ' on' : ''), esc(name));
      t.onclick = () => { this.setZone(pane.idx); this.openFile(name, pane.idx); pane.ta.focus(); };
      pane.tabsEl.append(t);
    });
  },
  renderTree() {
    this.treeEl.innerHTML = '<div style="color:var(--amber);letter-spacing:.15em;font-size:11px;margin-bottom:6px">FILES</div>';
    Object.keys(this.filesState).forEach(name => {
      const open = this.panes.some(p => p.active === name);
      const f = el('div', 'fitem' + (open ? ' open' : ''), '▸ ' + esc(name));
      f.onclick = () => { this.openFile(name); this.panes[Math.min(this.zone, this.panes.length - 1)].ta.focus(); };
      this.treeEl.append(f);
    });
    if (this.panes.length < 2) {
      const b = el('button', 'btn', '⫶ Split pane');
      b.style.cssText = 'margin-top:12px;font-size:11px;padding:4px 10px';
      b.onclick = () => { this.addPane(); this.renderTree(); };
      this.treeEl.append(b);
    }
  },
  setZone(z) {
    this.zone = z;
    this.panes.forEach((p, i) => p.dom.classList.toggle('activePane', i === z));
    this.termEl.classList.toggle('activePane', z === this.panes.length);
  },
  cycleZone(dir) {
    const count = this.panes.length + 1;   // panes + terminal
    const z = ((this.zone + dir) % count + count) % count;
    this.setZone(z);
    if (z < this.panes.length) this.panes[z].ta.focus(); else this.termIn.focus();
  },

  /* ── diff rendering ──────────────────────────────────────────── */
  renderDiff(pane) {
    const t = this.ticket();
    const text = pane.active ? this.filesState[pane.active] : '';
    if (!t || !t.file || pane.active !== t.file) {
      pane.pre.innerHTML = esc(text) + '\n';
      return;
    }
    const cur = text.split('\n'), tgt = t.after.split('\n');
    pane.pre.innerHTML = cur.map((l, i) => {
      const ok = tgt[i] !== undefined && l.replace(/\s+$/, '') === tgt[i].replace(/\s+$/, '');
      const extra = i >= tgt.length && l.trim() === '';
      return `<span class="${ok || extra ? 'ok' : 'bad'}">${esc(l) || ' '}</span>`;
    }).join('\n') + '\n';
  },

  /* ── tickets ─────────────────────────────────────────────────── */
  setTicket(i) {
    this.ticketIdx = i;
    if (i >= this.content.tickets.length) { this.finish(); return; }
    const t = this.ticket();
    this.termNeeded = t.terminal ? t.terminal.slice() : [];
    this.termProgress = 0;
    this.lineTouched = {}; this.lineEvaluated = {};
    if (t.file) {
      this.minSum += levenshtein(this.filesState[t.file], t.after);
      this.openFile(t.file, 0);
      this.setZone(0);
      this.panes[0].ta.focus();
    } else {
      this.setZone(this.panes.length);
      this.termIn.focus();
    }
    if (t.split && this.panes.length < 2) { this.addPane(); this.renderTree(); }
    this.ticketEl.innerHTML =
      `<div class="tid">Ticket ${i + 1}/${this.content.tickets.length} — ${esc(t.title)}</div>
       <div class="brief">${esc(t.brief)}</div>`;
    this.targetEl.innerHTML = t.file
      ? `<div class="tv-head">TARGET — ${esc(t.file)}</div><pre>${esc(t.after)}</pre>`
      : `<div class="tv-head">TARGET — terminal</div><pre>${t.terminal.map(c => '$ ' + esc(c)).join('\n')}</pre>`;
    this.panes.forEach(p => this.renderDiff(p));
    this.guideDiff();
    this.hud();
  },
  checkTicket() {
    const t = this.ticket();
    if (!t || !t.file) return;
    if (this.norm(this.filesState[t.file]) === this.norm(t.after) && this.termProgress >= this.termNeeded.length) {
      // any touched-but-unleft lines match by definition now
      Object.keys(this.lineTouched).forEach(k => { if (!this.lineEvaluated[k]) { this.lineEvaluated[k] = true; this.fpGood++; } });
      Sound.good();
      UI.toast(`Ticket closed: ${t.title}`);
      this.setTicket(this.ticketIdx + 1);
    }
  },
  runCmd(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    this.termOut.textContent += '$ ' + cmd + '\n';
    const t = this.ticket();
    const expected = this.termNeeded[this.termProgress];
    if (t && expected && cmd === expected) {
      this.termProgress++;
      this.termOut.textContent += `  ✔ ${expected.split(' ')[0]} acknowledged\n`;
      Sound.good();
      if (this.termProgress >= this.termNeeded.length) {
        if (!t.file) { Sound.jingle(); UI.toast(`Ticket closed: ${t.title}`); this.setTicket(this.ticketIdx + 1); }
        else this.checkTicket();
      } else this.guideTerminal();
    } else {
      this.termOut.textContent += expected ? `  ✘ expected: ${expected}\n` : '  unknown command\n';
      Sound.buzz();
    }
    this.termOut.scrollTop = this.termOut.scrollHeight;
  },

  /* ── input & stats ───────────────────────────────────────────── */
  countKey(e) {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key) || /^F\d{1,2}$/.test(e.key)) return;
    this.keystrokes++;
    if (e.key === 'Backspace' || e.key === 'Delete') this.corrections++;
  },
  onKey(e) {
    if (!this.running) return false;
    if (e.key === 'PageDown') { this.cycleZone(1); return true; }
    if (e.key === 'PageUp') { this.cycleZone(-1); return true; }
    if (e.key === 'Escape') return true;
    return false;   // native editing (incl. Ctrl+C/X/V/Z/Y) stays untouched
  },
  fp() { const n = this.fpGood + this.fpBad; return n ? Math.round(100 * this.fpGood / n) : 100; },
  hud() {
    UI.hud(`<span>TICKET <b>${Math.min(this.ticketIdx + 1, this.content.tickets.length)}/${this.content.tickets.length}</b></span>
      <span>TIME <b>${fmtTime(this.timeLeft)}</b></span>
      <span>KEYS <b>+${Math.max(0, this.keystrokes - this.minSum)}</b> over min</span>
      <span>FIRST-PASS <b>${this.fp()}%</b></span>`);
  },

  /* ── guide ───────────────────────────────────────────────────── */
  guideDiff() {
    const t = this.ticket();
    if (!t || !t.file) { this.guideTerminal(); return; }
    const cur = this.norm(this.filesState[t.file] || ''), tgt = this.norm(t.after);
    if (cur === tgt) { Guide.idle('Buffer matches — ticket closing…'); return; }
    let i = 0;
    while (i < cur.length && i < tgt.length && cur[i] === tgt[i]) i++;
    if (i >= tgt.length || (cur.length > tgt.length && cur.slice(0, i) === tgt.slice(0, i) && i === tgt.length)) {
      Guide.forKeyName('Backspace', 'Bsp — trim the extra text'); return;
    }
    const ch = tgt[i];
    if (ch === '\n') Guide.forKeyName('Enter');
    else Guide.forChar(ch, ch === ' ' ? 'Space' : undefined);
  },
  guideTerminal() {
    const expected = this.termNeeded[this.termProgress];
    if (!expected) { Guide.idle(); return; }
    const typed = this.termIn.value;
    let i = 0;
    while (i < typed.length && i < expected.length && typed[i] === expected[i]) i++;
    if (typed === expected) Guide.forKeyName('Enter', 'Ent — run it');
    else if (i < typed.length) Guide.forKeyName('Backspace', 'Bsp — fix the command');
    else Guide.forChar(expected[i], expected[i] === ' ' ? 'Space' : undefined);
  },

  /* ── endings ─────────────────────────────────────────────────── */
  fail(note) {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    Save.record(this.def.id, false, null, 'time', true);
    UI.results({
      levelId: this.def.id, passed: false, failNote: note,
      rows: [['Tickets closed', `${this.ticketIdx}/${this.content.tickets.length}`],
             ['First-pass lines', this.fp() + '%'], ['Keystrokes over min', '+' + Math.max(0, this.keystrokes - this.minSum)]],
      onRetry: () => this.start(this.lv)
    });
  },
  finish() {
    this.running = false;
    clearInterval(this.timer);
    const time = this.def.time - this.timeLeft;
    const fp = this.fp();
    const over = Math.max(0, this.keystrokes - this.minSum);
    const passed = fp >= this.def.firstPass;
    Save.record(this.def.id, passed, { time: Math.round(time), over, fp }, 'time', true);
    UI.results({
      levelId: this.def.id, passed,
      failNote: passed ? null : 'Too many lines needed a second pass.',
      rows: [['Time', fmtTime(time)], ['Tickets', `${this.content.tickets.length}/${this.content.tickets.length}`],
             ['First-pass lines', `${fp}% (min ${this.def.firstPass}%)`],
             ['Keystrokes over min', '+' + over]],
      onRetry: () => this.start(this.lv)
    });
  }
};
