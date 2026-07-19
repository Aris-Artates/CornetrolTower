/* ════════════════════════════════════════════════════════════════
   CODETYPE — Monkeytype-style flow typing over programming syntax.
   Powers two things:
     • Stage 3 capstone level 3-6 (gated WPM/accuracy run)
     • the Practice minigame (pick layers · difficulty · words/time/endless)
   Content = real airport code lines mixed with random words & gibberish,
   drawn only from the character sets of the selected keymap layers.
   Reuses the .t-* typing styles from Stage 1.
   ════════════════════════════════════════════════════════════════ */

/* Airport-flavoured one-liners. snake_case + camelCase, symbol-dense.
   Lines with digits are auto-filtered out unless the FN layer is on. */
const CODELINES = [
  'gate = free_gate(wide_body=True)',
  'while not tower.clear: hold(plane)',
  'bp.valid = (bp.name != "") and bp.seat != None',
  'return all(checks) and not flags["standby"]',
  'log("frost", sensor.zone); dispatch(rig)',
  'def dispatchNow(truck, job): truck.queue.append(job)',
  'belt_map = {"intl": ["a"], "dom": ["c"]}',
  'planes = [p for p in sky if p.fuel > low]',
  'assignGate(flight, zone="A", heavy=flight.big)',
  'if not runway.open: reroute(plane, alt="hold")',
  'carousel.route(bag) if bag.zone else drop(bag)',
  'status = {"jam": belt.isJammed(), "rpm": belt.rpm}',
  'radar.sweep = (radar.sweep + rate * dt) % 360',
  'if fuel < 25: divert(plane, nearest=True)',
  'gate_row = grid[4][2]; grid[4][2] = None',
  'x, y = clamp(px, 0, W), clamp(py, 0, H)',
  'carousel_3.restart(); check(deice_board)',
  'eta = now() + 15 * 60; board.update(eta)',
  'seats = [s for s in rows if s.free][:6]',
  'fuel_truck.dispatchNow(gate=7, urgent=True)'
];

const CodeType = {
  // char pools per layer (used for gibberish, symbol bursts, filtering)
  BASE: "abcdefghijklmnopqrstuvwxyz',.;-/",
  BASE_UP: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  SYM: "~!@#$%^&*()_+={}[]|\\:;\"'<>?/`-.,",
  NUM: '0123456789.+-*/=',
  SYMBURSTS: ['()', '{}', '[]', '=>', '===', '!=', '&&', '||', '::', '<>', '+=', '->', '()=>{}', '[]+{}', '<=>', '!==', '|>', '&|'],
  NAVKEYS: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'],
  NAVLABEL: { ArrowLeft: '←', ArrowDown: '↓', ArrowUp: '↑', ArrowRight: '→', Home: 'HOME', End: 'END', PageUp: 'PGUP', PageDown: 'PGDN' },

  /* ── content generation ──────────────────────────────────────── */
  allowedSet(layers) {
    let s = '';
    if (layers.has(0)) s += this.BASE + this.BASE_UP + ' ';
    if (layers.has(2)) s += this.SYM;
    if (layers.has(3)) s += this.NUM;
    return new Set(s.split(''));
  },
  typePool(layers) {
    let s = '';
    if (layers.has(0)) s += this.BASE;
    if (layers.has(2)) s += this.SYM;
    if (layers.has(3)) s += this.NUM;
    return s || this.BASE;
  },
  gibberish(pool, lenRange) {
    const n = irnd(lenRange[0], lenRange[1]);
    let s = '';
    for (let i = 0; i < n; i++) s += pool[Math.floor(Math.random() * pool.length)];
    return s;
  },
  numberToken() {
    const forms = [
      () => String(irnd(0, 9999)),
      () => `${irnd(1, 99)}.${irnd(0, 99)}`,
      () => `${irnd(1, 99)}${pick(['+', '-', '*', '/'])}${irnd(1, 99)}`,
      () => `${irnd(0, 9)}${irnd(0, 9)}${irnd(0, 9)}`
    ];
    return pick(forms)();
  },
  fitsLayers(str, allowed) {
    for (const c of str) { if (c === ' ') continue; if (!allowed.has(c)) return false; }
    return true;
  },
  // build `groups` word-groups worth of tokens for the given options
  buildChunk(opts, groups) {
    const layers = opts.layers;
    const D = CONFIG.codetype.difficulties[opts.difficulty];
    const allowed = this.allowedSet(layers);
    const pool = this.typePool(layers);
    const useBase = layers.has(0), useSym = layers.has(2), useNum = layers.has(3), useNav = layers.has(1);
    const codeOk = CODELINES.filter(l => this.fitsLayers(l, allowed));
    const words = useBase ? CONTENT.homeWords.concat(CONTENT.topWords, CONTENT.botWords) : [];
    const toks = [];
    const push = (s) => { for (const ch of s) toks.push({ ch }); };
    let made = 0;
    while (made < groups) {
      const r = Math.random();
      if (useSym && codeOk.length && r < D.code) {
        push(pick(codeOk));
        made += CONFIG.codetype.codeWordWeight;
      } else if (r < D.code + D.gib) {
        push(this.gibberish(pool, D.wordLen));
        made++;
      } else if (useNum && Math.random() < 0.35) {
        push(this.numberToken());
        made++;
      } else if (useSym && Math.random() < 0.4) {
        push(pick(this.SYMBURSTS));
        made++;
      } else if (useBase && words.length) {
        push(pick(words));
        made++;
      } else {
        push(this.gibberish(pool, D.wordLen));
        made++;
      }
      if (useNav && Math.random() < D.navRate) {
        const k = pick(this.NAVKEYS);
        toks.push({ ch: ' ' });
        toks.push({ key: k, label: this.NAVLABEL[k] });
      }
      toks.push({ ch: ' ' });
    }
    if (toks.length && toks[toks.length - 1].ch === ' ') toks.pop();
    return toks;
  },

  /* ── run lifecycle ───────────────────────────────────────────── */
  // opts: { layers:Set, difficulty, lengthMode:'words'|'time'|'endless', amount }
  // ctx : { title, crumb, gate, onFinish(stats), levelId }
  run: null,
  begin(opts, ctx) {
    const groups = opts.lengthMode === 'words' ? opts.amount : 60;
    const R = this.run = {
      opts, ctx,
      tokens: this.buildChunk(opts, groups),
      idx: 0, errors: 0, keystrokes: 0, correct: 0, t0: 0,
      timeLeft: opts.lengthMode === 'time' ? opts.amount : 0,
      running: true, timer: null
    };
    const s = UI.clear(ctx.crumb);
    const w = el('div', 't-stage');
    w.append(el('h2', 'board', ctx.title));
    w.append(el('div', 'subtle', ctx.subtitle || ''));
    w.append(el('div', 't-meters',
      `<span>WPM <b id="c-wpm">0</b></span><span>ACC <b id="c-acc">100%</b></span>
       <span id="c-lenlabel">PROGRESS <b id="c-len">0%</b></span>
       <span style="color:var(--amber)" id="c-mode"></span>`));
    R.textEl = el('div', 't-text');
    w.append(R.textEl);
    const note = opts.lengthMode === 'endless'
      ? 'Endless — press Esc to stop and see your stats. Wrong keys buzz and hold the cursor.'
      : 'Wrong keys buzz and hold the cursor until you hit the right one.';
    w.append(el('div', 't-note', note));
    const bar = el('div', 't-phase');
    const restart = el('button', 'btn', '↻ Restart');
    restart.onclick = () => this.begin(opts, ctx);
    bar.append(restart);
    if (ctx.onQuit) { const q = el('button', 'btn', '◂ ' + (ctx.quitLabel || 'Back')); q.onclick = ctx.onQuit; bar.append(q); }
    w.append(bar);
    s.append(w);

    document.getElementById('c-mode').textContent =
      opts.lengthMode === 'time' ? 'TIMED' : opts.lengthMode === 'endless' ? 'ENDLESS' : 'SPRINT';
    if (opts.lengthMode === 'time') document.getElementById('c-lenlabel').firstChild.textContent = 'TIME ';

    UI.setCleanup(() => { clearInterval(R.timer); R.running = false; });
    R.timer = setInterval(() => this.tick(), 250);
    this.render();
    this.hint();
    Keys.set({ capture: true, onKey: (e) => this.onKey(e) });
  },

  ensureAhead() {
    const R = this.run;
    if (R.opts.lengthMode === 'words') return;
    if (R.idx > R.tokens.length - 40) R.tokens = R.tokens.concat(this.buildChunk(R.opts, 30));
  },

  onKey(e) {
    const R = this.run;
    if (!R || !R.running) return false;
    const k = e.key;
    if (k === 'Escape') { if (R.opts.lengthMode === 'endless') this.finish(); return true; }
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock'].includes(k)) return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const tok = R.tokens[R.idx];
    if (!tok) return false;
    const want = tok.ch !== undefined ? tok.ch : tok.key;
    const got = tok.ch !== undefined ? (k.length === 1 ? k : null) : k;
    const isNav = this.NAVKEYS.includes(k);
    if (got === null && !isNav) return false;
    if (!R.t0) { R.t0 = performance.now(); }
    R.keystrokes++;
    if (got === want) {
      R.idx++; R.correct++;
      Sound.tick();
      this.ensureAhead();
      if (R.opts.lengthMode === 'words' && R.idx >= R.tokens.length) { this.finish(); return true; }
      this.render(); this.hint(); this.meters();
    } else {
      R.errors++;
      Sound.buzz();
      this.render(); this.hint(); this.meters();
    }
    return true;
  },

  tick() {
    const R = this.run;
    if (!R || !R.running) return;
    if (R.opts.lengthMode === 'time' && R.t0) {
      R.timeLeft = R.opts.amount - (performance.now() - R.t0) / 1000;
      if (R.timeLeft <= 0) { R.timeLeft = 0; this.meters(); this.finish(); return; }
    }
    this.meters();
  },

  stats() {
    const R = this.run;
    const mins = R.t0 ? (performance.now() - R.t0) / 60000 : 0;
    const elapsed = R.t0 ? (performance.now() - R.t0) / 1000 : 0;
    const wpm = mins > 0 ? Math.round((R.correct / 5) / mins) : 0;
    const acc = R.keystrokes ? Math.round(100 * Math.max(0, R.keystrokes - R.errors) / R.keystrokes) : 100;
    return { wpm, acc, elapsed, errors: R.errors, keystrokes: R.keystrokes };
  },
  meters() {
    const R = this.run, { wpm, acc } = this.stats();
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('c-wpm', wpm); set('c-acc', acc + '%');
    if (R.opts.lengthMode === 'time') set('c-len', fmtTime(R.timeLeft));
    else if (R.opts.lengthMode === 'words') set('c-len', Math.round(100 * R.idx / R.tokens.length) + '%');
    else set('c-len', R.correct + ' keys');
  },

  render() {
    const R = this.run;
    const start = Math.max(0, R.idx - 40);
    const end = Math.min(R.tokens.length, R.idx + 140);
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const t = R.tokens[i];
      let cls = 'tok', body;
      if (t.ch !== undefined) { body = (i === R.idx && t.ch === ' ') ? '␣' : t.ch; }
      else { cls += ' special'; body = t.label || t.key; }
      if (i < R.idx) cls += ' done';
      if (i === R.idx) cls += ' cur';
      frag.append(el('span', cls, esc(body)));
    }
    R.textEl.innerHTML = '';
    R.textEl.append(frag);
    const cur = R.textEl.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  },
  hint() {
    const R = this.run, t = R.tokens[R.idx];
    if (!t) return;
    if (t.ch !== undefined) Guide.forChar(t.ch === ' ' ? ' ' : t.ch, t.ch === ' ' ? 'Space' : undefined);
    else Guide.forKeyName(t.key, t.label);
  },

  finish() {
    const R = this.run;
    if (!R.running) return;
    R.running = false;
    clearInterval(R.timer);
    Keys.clear();
    R.ctx.onFinish(this.stats());
  },

  /* ── Stage 3 capstone level (gated) ──────────────────────────── */
  startLevel(lv) {
    const def = lv.def;
    const opts = { layers: new Set(def.layers), difficulty: def.difficulty, lengthMode: 'words', amount: def.groups };
    const runLevel = () => this.begin(opts, {
      title: `${def.id} — ${def.name}`,
      subtitle: `Flow-type real code, words & gibberish · Gate: ${gateSummary(def.id)}`,
      crumb: `${def.id} · SYNTAX SPRINT`,
      quitLabel: 'Level select', onQuit: () => Screens.levels(3),
      onFinish: (st) => {
        const passed = st.wpm >= def.gate.wpm && st.acc >= def.gate.acc;
        Save.record(def.id, passed, { wpm: st.wpm, acc: st.acc }, 'wpm', false);
        UI.results({
          levelId: def.id, passed,
          rows: [['Speed', st.wpm + ' WPM'], ['Accuracy', st.acc + '%'], ['Errors', st.errors], ['Keystrokes', st.keystrokes]],
          onRetry: runLevel
        });
      }
    });
    runLevel();
  },

  /* ── Practice minigame setup screen ──────────────────────────── */
  prefs() {
    if (!Save.data.practice)
      Save.data.practice = { layers: [0, 2], difficulty: 'normal', lengthMode: 'words', amount: 50 };
    return Save.data.practice;
  },
  openPractice() {
    const p = this.prefs();
    const s = UI.clear('PRACTICE — CODE DRILL');
    Guide.idle('Practice mode — build your own drill');
    const w = el('div', 'wrap');
    w.append(el('h1', 'board', 'Code Drill'));
    w.append(el('div', 'subtle', 'A Monkeytype-style flow of real code, words & gibberish. Pick your layers, difficulty and length.'));

    const chipRow = (labelTxt) => { const r = el('div', 't-phase'); r.style.flexWrap = 'wrap';
      r.append(el('span', null, `<span style="width:104px;display:inline-block;color:var(--dim);font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase">${labelTxt}</span>`)); return r; };

    // Layer toggles (multi-select)
    const layerRow = chipRow('Layers');
    const LAYER_DEFS = [[0, 'Base (letters)'], [1, 'NAV (arrows)'], [2, 'SYM (symbols)'], [3, 'FN (numbers)']];
    LAYER_DEFS.forEach(([n, lbl]) => {
      const b = el('button', 'btn', lbl);
      const on = () => p.layers.includes(n);
      const paint = () => b.classList.toggle('on', on());
      b.onclick = () => {
        if (on()) { if (p.layers.length > 1) p.layers = p.layers.filter(x => x !== n); }
        else p.layers = p.layers.concat(n).sort();
        Save.persist(); paint(); Sound.blip();
      };
      paint(); layerRow.append(b);
    });
    w.append(layerRow);

    // Difficulty (single-select)
    const diffRow = chipRow('Difficulty');
    Object.entries(CONFIG.codetype.difficulties).forEach(([key, d]) => {
      const b = el('button', 'btn', d.label);
      const paint = () => b.classList.toggle('on', p.difficulty === key);
      b.onclick = () => { p.difficulty = key; Save.persist(); diffRow.querySelectorAll('.btn').forEach(x => x.classList.remove('on')); b.classList.add('on'); Sound.blip(); };
      paint(); diffRow.append(b);
    });
    w.append(diffRow);

    // Length: words / time / endless
    const lenRow = chipRow('Length');
    const repaintLen = () => lenRow.querySelectorAll('.btn').forEach(x => x.classList.toggle('on', x.dataset.on === '1'));
    const mkLen = (label, mode, amount) => {
      const b = el('button', 'btn', label);
      b.dataset.on = (p.lengthMode === mode && (amount === undefined || p.amount === amount)) ? '1' : '0';
      b.onclick = () => {
        p.lengthMode = mode; if (amount !== undefined) p.amount = amount;
        Save.persist();
        lenRow.querySelectorAll('.btn').forEach(x => x.dataset.on = '0');
        b.dataset.on = '1'; repaintLen(); Sound.blip();
      };
      return b;
    };
    CONFIG.codetype.wordCounts.forEach(n => lenRow.append(mkLen(n + ' words', 'words', n)));
    CONFIG.codetype.times.forEach(t => lenRow.append(mkLen(t + 's', 'time', t)));
    lenRow.append(mkLen('Endless', 'endless'));
    w.append(lenRow);
    setTimeout(repaintLen, 0);

    const acts = el('div', 't-phase'); acts.style.marginTop = '18px';
    const start = el('button', 'btn primary', '▸ Start drill');
    start.onclick = () => this.startPractice();
    const back = el('button', 'btn', '◂ Menu'); back.onclick = () => Screens.menu();
    acts.append(start, back);
    w.append(acts);
    s.append(w);
  },
  startPractice() {
    const p = this.prefs();
    if (!p.layers.length) { p.layers = [0]; }
    const typable = p.layers.some(l => l === 0 || l === 2 || l === 3);
    if (!typable) { UI.toast('Pick at least one typable layer (Base, SYM or FN).'); return; }
    const opts = { layers: new Set(p.layers), difficulty: p.difficulty, lengthMode: p.lengthMode, amount: p.amount };
    const layerTxt = p.layers.map(l => ['Base', 'NAV', 'SYM', 'FN'][l]).join('+');
    this.begin(opts, {
      title: 'Code Drill',
      subtitle: `${CONFIG.codetype.difficulties[p.difficulty].label} · layers ${layerTxt} · ${p.lengthMode === 'words' ? p.amount + ' words' : p.lengthMode === 'time' ? p.amount + 's' : 'endless'}`,
      crumb: 'PRACTICE — CODE DRILL',
      quitLabel: 'Setup', onQuit: () => this.openPractice(),
      onFinish: (st) => this.practiceResult(st, opts)
    });
  },
  practiceResult(st, opts) {
    const best = Save.data.practiceBest || 0;
    const isBest = st.wpm > best;
    if (isBest) { Save.data.practiceBest = st.wpm; Save.persist(); }
    Sound.jingle();
    const m = UI.modal(
      `<h3 class="pass">■ DRILL COMPLETE</h3>
       <div class="statrows">
         <div><span>Speed</span><span>${st.wpm} WPM</span></div>
         <div><span>Accuracy</span><span>${st.acc}%</span></div>
         <div><span>Time</span><span>${fmtTime(st.elapsed)}</span></div>
         <div><span>Errors</span><span>${st.errors}</span></div>
         <div><span>Best WPM</span><span>${Save.data.practiceBest || st.wpm}${isBest ? ' ★ new!' : ''}</span></div>
       </div>
       <div class="acts"></div>`);
    const acts = m.box.querySelector('.acts');
    const again = el('button', 'btn primary', '↻ Again');
    again.onclick = () => { m.close(); this.begin(opts, {
      title: 'Code Drill', crumb: 'PRACTICE — CODE DRILL', quitLabel: 'Setup',
      onQuit: () => this.openPractice(), onFinish: (s2) => this.practiceResult(s2, opts) }); };
    const setup = el('button', 'btn', 'Setup'); setup.onclick = () => { m.close(); this.openPractice(); };
    const menu = el('button', 'btn', 'Menu'); menu.onclick = () => { m.close(); Screens.menu(); };
    acts.append(again, setup, menu);
  }
};
