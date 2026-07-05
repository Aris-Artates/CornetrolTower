/* ════════════════════════════════════════════════════════════════
   STAGE 4 — CORNE-TROLL TOWER (Layer 3 FN)
   F-key tags select inbound planes, Tab cycles duplicates,
   Enter clears the closest one to land. Optional FN-numpad
   heading prompts in 4-4/4-5.
   ════════════════════════════════════════════════════════════════ */
const Stage4 = {
  lv: null, def: null,
  field: null, msgEl: null, npEl: null,
  planes: [], landed: 0, wrongSel: 0, spawnClock: 0, planeSeq: 0,
  sel: null,               // { tag, idx }
  runwayBusy: false, numpad: null,   // { plane, code, typed }
  raf: 0, lastT: 0, running: false, t0: 0, lastGuideKey: '',

  AIRLINES: ['DAL', 'UAL', 'AAL', 'SWA', 'JBU', 'KLM', 'ANA', 'QFA', 'PAL', 'CEB'],

  start(lv) {
    this.lv = lv; this.def = lv.def;
    const s = UI.clear(`${lv.def.id} · CORNE-TROLL TOWER`);
    const w = el('div', 'tw-wrap');
    w.append(el('div', 'tw-hud',
      `<span>LANDED <b id="t-land">0/${this.def.land}</b></span>
       <span>WRONG <b id="t-wrong">0</b>/${this.def.maxWrong}</span>
       <span>AIRBORNE <b id="t-air">0</b></span>
       <span>TIME <b id="t-time">0:00</b></span>`));
    this.field = el('div', 'radar');
    [140, 280, 430].forEach(r => {
      const ring = el('div', 'ring');
      ring.style.cssText = `width:${r * 2}px;height:${r * 2}px;left:calc(50% - ${r}px);bottom:${60 - r}px`;
      this.field.append(ring);
    });
    this.runwayEl = el('div', 'runway');
    this.field.append(this.runwayEl);
    this.msgEl = el('div', 'tw-msg');
    this.msgEl.style.display = 'none';
    this.field.append(this.msgEl);
    w.append(this.field);
    s.append(w);

    this.planes = []; this.landed = 0; this.wrongSel = 0; this.sel = null;
    this.runwayBusy = false; this.numpad = null; this.spawnClock = 0; this.planeSeq = 0;
    this.running = false; this.lastGuideKey = '';

    UI.setCleanup(() => { cancelAnimationFrame(this.raf); this.running = false; });
    UI.briefing(this.field, `Tower briefing — ${this.def.id} ${this.def.name}`, [
      'Every inbound plane carries an <b>F-key tag</b>. Hold <kbd>FN</kbd> (right thumb, outer) — F1–F12 sit on the LEFT hand in a 3×4 grid.',
      'Press the tag of the plane <b>closest to the runway</b>. Shared tags? <kbd>Tab</kbd> cycles the candidates.',
      '<kbd>Enter</kbd> clears the selected plane to land. Clearing the wrong plane = go-around penalty.',
      'Planes burn holding fuel — a single fuel-out fails the shift.' +
        (this.def.numpad ? ' Some clearances ask for a heading on the FN numpad (right hand).' : ''),
      `Land ${this.def.land} · at most ${this.def.maxWrong} wrong clearances.`
    ], 'Open the frequency', () => this.go());
  },

  go() {
    this.running = true;
    this.t0 = performance.now(); this.lastT = this.t0;
    for (let i = 0; i < this.def.initial; i++) this.spawn(0.35 + i * 0.18);
    Keys.set({ capture: true, onKey: (e) => this.onKey(e) });
    this.guideClosest(true);
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (t - this.lastT) / 1000);
      this.lastT = t;
      this.tick(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  threshold() {
    return { x: this.field.clientWidth / 2, y: this.field.clientHeight - 60 };
  },
  dist(p) { const th = this.threshold(); return Math.hypot(p.x - th.x, p.y - th.y); },
  alive() { return this.planes.filter(p => !p.dead && !p.landing); },
  closest() {
    const a = this.alive();
    return a.length ? a.reduce((m, p) => this.dist(p) < this.dist(m) ? p : m) : null;
  },

  spawn(distFrac) {
    const W = this.field.clientWidth, H = this.field.clientHeight;
    const th = this.threshold();
    const ang = rnd(Math.PI * 0.15, Math.PI * 0.85);   // fan above the runway
    const R = (distFrac !== undefined ? distFrac : 1) * Math.min(H - 90, W * 0.48);
    const p = {
      id: ++this.planeSeq,
      callsign: pick(this.AIRLINES) + irnd(100, 999),
      tag: this.pickTag(),
      x: th.x + Math.cos(ang) * R * (Math.random() < 0.5 ? -1 : 1),
      y: th.y - Math.sin(ang) * R,
      speed: rnd(this.def.speed[0], this.def.speed[1]),
      fuelMax: this.def.fuel, fuel: this.def.fuel,
      landing: false, dead: false, dom: null
    };
    p.x = Math.max(30, Math.min(W - 30, p.x));
    p.y = Math.max(30, Math.min(th.y - 80, p.y));
    const d = el('div', 'plane',
      `<span class="ftag">${p.tag}</span><span class="icon" style="color:var(--green)">▲</span>
       <span class="fuel"><i style="width:100%"></i></span><span class="callsign">${p.callsign}</span>`);
    p.dom = d;
    this.field.append(d);
    this.planes.push(p);
  },
  pickTag() {
    const pool = Array.from({ length: this.def.tags }, (_, i) => 'F' + (i + 1));
    if (this.def.dup) return pick(pool);
    const used = this.alive().map(p => p.tag);
    const free = pool.filter(t => !used.includes(t));
    return free.length ? pick(free) : pick(pool);
  },

  tick(dt) {
    const th = this.threshold();
    // spawning
    this.spawnClock += dt;
    if (this.spawnClock >= this.def.spawnEvery && this.alive().length < this.def.maxPlanes) {
      this.spawnClock = 0;
      this.spawn();
    }
    for (const p of this.planes) {
      if (p.dead) continue;
      const d = this.dist(p);
      const vx = (th.x - p.x) / (d || 1), vy = (th.y - p.y) / (d || 1);
      if (p.landing) {
        p.x += vx * 95 * dt; p.y += vy * 95 * dt;
        if (d < 10) { this.touchdown(p); continue; }
      } else {
        if (d > 46) { p.x += vx * p.speed * dt; p.y += vy * p.speed * dt; }
        else { p.x += Math.sin(performance.now() / 500 + p.id) * 6 * dt; }   // hold pattern
        if (!(this.numpad && this.numpad.plane === p)) p.fuel -= dt;
        if (p.fuel <= 0) { this.failLevel(`${p.callsign} flamed out — a plane ran dry.`); return; }
      }
      this.drawPlane(p, th);
    }
    this.hud();
    this.guideClosest();
  },
  drawPlane(p, th) {
    p.dom.style.left = p.x + 'px';
    p.dom.style.top = p.y + 'px';
    const angle = Math.atan2(th.y - p.y, th.x - p.x) * 180 / Math.PI + 90;
    p.dom.querySelector('.icon').style.transform = `rotate(${angle}deg)`;
    const f = p.dom.querySelector('.fuel i');
    const frac = Math.max(0, p.fuel / p.fuelMax);
    f.style.width = (frac * 100) + '%';
    f.classList.toggle('low', frac < 0.25);
  },

  /* ── selection ───────────────────────────────────────────────── */
  candidates(tag) {
    return this.alive().filter(p => p.tag === tag).sort((a, b) => this.dist(a) - this.dist(b));
  },
  refreshSelection() {
    this.planes.forEach(p => { if (p.dom) { p.dom.classList.remove('sel', 'candidate'); } });
    if (!this.sel) return;
    const cands = this.candidates(this.sel.tag);
    if (!cands.length) { this.sel = null; return; }
    this.sel.idx = this.sel.idx % cands.length;
    cands.forEach((p, i) => p.dom.classList.add(i === this.sel.idx ? 'sel' : 'candidate'));
  },
  selectedPlane() {
    if (!this.sel) return null;
    const cands = this.candidates(this.sel.tag);
    return cands.length ? cands[this.sel.idx % cands.length] : null;
  },

  onKey(e) {
    if (!this.running) return false;
    const k = e.key;
    if (this.numpad) {
      if (/^[0-9]$/.test(k)) { this.numpad.typed += k; this.renderNumpad(); Sound.tick(); return true; }
      if (k === 'Backspace') { this.numpad.typed = this.numpad.typed.slice(0, -1); this.renderNumpad(); return true; }
      if (k === 'Enter') {
        if (this.numpad.typed === this.numpad.code) { const p = this.numpad.plane; this.closeNumpad(); this.land(p); }
        else { Sound.buzz(); this.numpad.typed = ''; this.renderNumpad(); this.say('Wrong heading — again.'); }
        return true;
      }
      return true;   // swallow everything else during the prompt
    }
    if (/^F\d{1,2}$/.test(k)) {
      const cands = this.candidates(k);
      if (!cands.length) { Sound.buzz(); this.say(`No traffic squawking ${k}.`); return true; }
      this.sel = { tag: k, idx: 0 };
      Sound.blip();
      this.refreshSelection();
      this.guideSelection();
      return true;
    }
    if (k === 'Tab') {
      if (this.sel) {
        const n = this.candidates(this.sel.tag).length;
        if (n > 1) { this.sel.idx = (this.sel.idx + 1) % n; Sound.blip(); this.refreshSelection(); }
      }
      return true;
    }
    if (k === 'Enter') {
      const p = this.selectedPlane();
      if (!p) { Sound.buzz(); this.say('Select a tag first (FN + F-key).'); return true; }
      if (this.runwayBusy) { Sound.buzz(); this.say('Runway occupied — hold.'); return true; }
      const closest = this.closest();
      if (p !== closest) {
        this.wrongSel++;
        Sound.buzz();
        this.say(`${p.callsign} go-around! ${closest ? closest.callsign + ' was next.' : ''}`);
        // loop the plane back out: it re-enters from further away, time is lost
        const th = this.threshold();
        const d = this.dist(p);
        const push = Math.min(d * 0.4 + 120, 260);
        const nx = p.x + (p.x - th.x) / (d || 1) * push, ny = p.y - Math.abs(push * 0.7);
        p.x = Math.max(30, Math.min(this.field.clientWidth - 30, nx));
        p.y = Math.max(30, ny);
        this.sel = null;
        this.refreshSelection();
        if (this.wrongSel > this.def.maxWrong) { this.failLevel('Too many wrong clearances — the chief pulls your headset.'); }
        return true;
      }
      if (this.def.numpad && Math.random() < CONFIG.numpadChance) { this.openNumpad(p); return true; }
      this.land(p);
      return true;
    }
    return false;
  },

  land(p) {
    p.landing = true;
    this.runwayBusy = true;
    this.runwayEl.classList.add('busy');
    this.sel = null;
    this.refreshSelection();
    this.say(`${p.callsign} cleared to land.`);
    Sound.good();
  },
  touchdown(p) {
    p.dead = true;
    p.dom.remove();
    this.landed++;
    Sound.good();
    setTimeout(() => { this.runwayBusy = false; this.runwayEl.classList.remove('busy'); }, 800);
    if (this.def.reshuffle) {
      this.alive().forEach(q => { q.tag = this.pickTag(); q.dom.querySelector('.ftag').textContent = q.tag; });
      this.sel = null;
      this.refreshSelection();
      this.say('Storm cell — tags reshuffled!');
    }
    if (this.landed >= this.def.land) this.finish();
  },

  /* ── FN numpad prompt (optional flavour, config-gated) ───────── */
  openNumpad(p) {
    const code = String(irnd(0, 35) * 10).padStart(3, '0');
    this.numpad = { plane: p, code, typed: '' };
    this.npEl = el('div', 'tw-numpad');
    this.field.append(this.npEl);
    this.renderNumpad();
  },
  renderNumpad() {
    const n = this.numpad;
    this.npEl.innerHTML =
      `<div style="font-size:12px;color:var(--dim)">TOWER: "${n.plane.callsign}, say heading <b style="color:var(--amber)">${n.code}</b>" — FN numpad, then Enter</div>
       <div class="np-in">${esc(n.typed) || '···'}</div>`;
    const next = n.code[n.typed.length];
    if (n.typed === n.code) Guide.forKeyName('Enter', 'Ent — read back complete');
    else if (next) Guide.forChar(next, `${next} (FN numpad)`);
    else Guide.forKeyName('Backspace', 'Bsp — too many digits');
  },
  closeNumpad() {
    if (this.npEl) this.npEl.remove();
    this.numpad = null;
  },

  /* ── guide & hud ─────────────────────────────────────────────── */
  guideClosest(force) {
    if (this.numpad) return;
    if (this.sel) return;      // selection guide is active
    const c = this.closest();
    if (!c) return;
    const key = 'closest:' + c.tag + c.id;
    if (!force && key === this.lastGuideKey) return;
    this.lastGuideKey = key;
    Guide.forChar(c.tag, `${c.tag} — select ${c.callsign} (closest)`);
  },
  guideSelection() {
    this.lastGuideKey = 'sel';
    Guide.forCluster(0, ['Tab', 'Enter'],
      'Tab cycles planes sharing the tag · Enter clears the selected plane to land');
  },
  say(msg) {
    this.msgEl.textContent = msg;
    this.msgEl.style.display = 'block';
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => { this.msgEl.style.display = 'none'; }, 2600);
  },
  hud() {
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('t-land', `${this.landed}/${this.def.land}`);
    set('t-wrong', this.wrongSel);
    set('t-air', this.alive().length);
    set('t-time', fmtTime((performance.now() - this.t0) / 1000));
  },

  /* ── endings ─────────────────────────────────────────────────── */
  failLevel(note) {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.closeNumpad();
    Save.record(this.def.id, false, null, 'time', true);
    UI.results({
      levelId: this.def.id, passed: false, failNote: note,
      rows: [['Landed', `${this.landed}/${this.def.land}`], ['Wrong clearances', this.wrongSel],
             ['Time', fmtTime((performance.now() - this.t0) / 1000)]],
      onRetry: () => this.start(this.lv)
    });
  },
  finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.closeNumpad();
    const time = (performance.now() - this.t0) / 1000;
    const passed = this.wrongSel <= this.def.maxWrong;
    Save.record(this.def.id, passed, { time: Math.round(time), wrong: this.wrongSel }, 'time', true);
    UI.results({
      levelId: this.def.id, passed,
      failNote: passed ? null : 'Too many wrong clearances.',
      rows: [['Landed', `${this.landed}/${this.def.land}`],
             ['Wrong clearances', `${this.wrongSel} (max ${this.def.maxWrong})`],
             ['Shift time', fmtTime(time)]],
      onRetry: () => this.start(this.lv)
    });
  }
};
