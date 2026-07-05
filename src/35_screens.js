/* ════════════════════════════════════════════════════════════════
   SCREENS — main menu, settings, credits, stage & level select.
   ════════════════════════════════════════════════════════════════ */
const Screens = {
  menu() {
    const s = UI.clear('MAIN MENU');
    Guide.idle();
    const w = el('div', 'wrap');
    w.append(el('div', 'menu-hero',
      `<div class="tower">Corne-trol Tower</div>
       <div class="tag">A 46-key career · Dvorak Programmer keymap</div>`));
    const list = el('div', 'menu-list');
    const mk = (label, fn) => { const b = el('button', 'btn', label); b.onclick = fn; return b; };
    list.append(
      mk('Play', () => Screens.stages()),
      mk('Settings', () => Screens.settings()),
      mk('Credits', () => Screens.credits()));
    w.append(list);
    if (!Save.canStore)
      w.append(el('div', 'storage-note', '⚠ Storage unavailable — progress is kept for this session only.'));
    s.append(w);
  },

  settings() {
    const s = UI.clear('SETTINGS');
    Guide.idle();
    const w = el('div', 'wrap');
    w.append(el('h1', 'board', 'Settings'));
    const mkSlider = (key, label) => {
      const row = el('div', 'set-row');
      const val = Math.round(Save.data.settings[key] * 100);
      row.innerHTML = `<label>${label}</label><input type="range" min="0" max="100" value="${val}"><span class="val">${val}%</span>`;
      const inp = row.querySelector('input'), out = row.querySelector('.val');
      inp.oninput = () => {
        Save.data.settings[key] = inp.value / 100;
        out.textContent = inp.value + '%';
        Save.persist(); Sound.applyVolumes();
        if (key !== 'music') Sound.blip();
      };
      return row;
    };
    w.append(mkSlider('master', 'Master'), mkSlider('music', 'Music'), mkSlider('sfx', 'SFX'));

    // The secret unlock-all button: fully invisible at rest, but a real
    // focusable element in the natural tab order. Reveals on hover / focus.
    const secret = el('button', null, 'unlock every level');
    secret.id = 'secret-unlock';
    secret.onclick = () => {
      Save.data.unlockAll = true; Save.persist();
      Sound.jingle();
      UI.toast('Tower override accepted — every level unlocked.');
    };
    w.append(secret);

    const back = el('button', 'btn', '◂ Back'); back.style.marginTop = '30px';
    back.onclick = () => Screens.menu();
    w.append(back);
    s.append(w);
  },

  credits() {
    const s = UI.clear('CREDITS');
    Guide.idle();
    const w = el('div', 'wrap');
    w.append(el('h1', 'board', 'Credits'));
    w.append(el('div', null,
      `<p><b>Corne-trol Tower</b> — a keyboard-learning game for the 46-key Corne split board.</p>
       <p class="subtle">Game design &amp; code — the Corne-trol Tower crew<br>
       Keymap — Dvorak Programmer v1 (see the in-game guide)<br>
       Built with plain HTML, CSS and JavaScript. No planes were harmed.</p>`));
    const row = el('div', null); row.style.display = 'flex'; row.style.gap = '12px'; row.style.marginTop = '10px';
    const mkLink = (label, url) => {
      const a = el('a', 'btn', label);
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.style.textDecoration = 'none';
      return a;
    };
    row.append(mkLink('💬 Discord', CONFIG.links.discord), mkLink('📘 Facebook', CONFIG.links.facebook));
    w.append(row);
    const back = el('button', 'btn', '◂ Back'); back.style.marginTop = '30px';
    back.onclick = () => Screens.menu();
    w.append(back);
    s.append(w);
  },

  stages() {
    const s = UI.clear('CAREER — STAGE SELECT');
    Guide.idle();
    const w = el('div', 'wrap');
    w.append(el('h1', 'board', 'Departures — pick your shift'));
    const grid = el('div', 'cardgrid');
    const perStage = [CONFIG.stage1, CONFIG.stage2, CONFIG.stage3, CONFIG.stage4];
    CONFIG.stages.forEach((st, i) => {
      const defs = perStage[i];
      const cleared = defs.filter(d => Save.passed(d.id)).length;
      const unlocked = Save.isUnlocked(defs[0].id);
      const card = el('div', 'card' + (unlocked ? '' : ' locked'),
        `<div class="kicker">Stage ${st.num}</div>
         <h3>${esc(st.title)}</h3>
         <div class="meta">${esc(st.job)}<br>Trains: ${esc(st.layer)}<br>Reuses: ${esc(st.reuse)}</div>
         ${unlocked
            ? `<div class="best">${cleared}/${defs.length} levels cleared</div>`
            : `<div class="lockline">🔒 Requires: clear ${esc(prevLevelId(defs[0].id))} (${esc(gateSummary(prevLevelId(defs[0].id)))})</div>`}
         ${cleared === defs.length ? '<div class="done">✔</div>' : ''}`);
      if (unlocked) card.onclick = () => Screens.levels(st.num);
      grid.append(card);
    });
    w.append(grid);

    // Profile summary
    const total = LEVELS.length, done = LEVELS.filter(l => Save.passed(l.id)).length;
    let bestWpm = 0;
    CONFIG.stage1.forEach(d => { const r = Save.rec(d.id); if (r && r.best) bestWpm = Math.max(bestWpm, r.best.wpm || 0); });
    const pct = i => { const defs = perStage[i]; return Math.round(100 * defs.filter(d => Save.passed(d.id)).length / defs.length); };
    w.append(el('div', 'profilebar',
      `<span>PROFILE</span><span>Cleared: <b>${done}/${total}</b></span>
       <span>S1 <b>${pct(0)}%</b> · S2 <b>${pct(1)}%</b> · S3 <b>${pct(2)}%</b> · S4 <b>${pct(3)}%</b></span>
       <span>Best WPM: <b>${bestWpm || '—'}</b></span>
       ${Save.data.unlockAll ? '<span style="color:var(--amber)">OVERRIDE ACTIVE</span>' : ''}`));
    s.append(w);
  },

  levels(stageNum) {
    const st = CONFIG.stages[stageNum - 1];
    const defs = [CONFIG.stage1, CONFIG.stage2, CONFIG.stage3, CONFIG.stage4][stageNum - 1];
    const s = UI.clear(`STAGE ${stageNum} — ${st.title.toUpperCase()}`);
    Guide.idle();
    const w = el('div', 'wrap');
    w.append(el('h1', 'board', `${st.title}`));
    w.append(el('div', 'subtle', `${st.job} — trains ${st.layer}`));
    const grid = el('div', 'cardgrid');
    defs.forEach(def => {
      const unlocked = Save.isUnlocked(def.id);
      const rec = Save.rec(def.id);
      const passed = Save.passed(def.id);
      let bestLine = '';
      if (rec && rec.best) {
        const b = rec.best;
        if (stageNum === 1) bestLine = `${b.wpm} WPM · ${b.acc}%`;
        else if (stageNum === 2) bestLine = `${fmtTime(b.time)} · ${b.falseTags} false · ${b.nameAcc}% names`;
        else if (stageNum === 3) bestLine = `${fmtTime(b.time)} · +${b.over} keys · ${b.fp}% first-pass`;
        else bestLine = `${fmtTime(b.time)} · ${b.wrong} wrong picks`;
      }
      const prev = prevLevelId(def.id);
      const card = el('div', 'card' + (unlocked ? '' : ' locked'),
        `<div class="kicker">${esc(def.id)}</div>
         <h3>${esc(def.name)}</h3>
         <div class="meta">Gate: ${esc(gateSummary(def.id))}</div>
         ${!unlocked ? `<div class="lockline">🔒 Clear ${esc(prev)} at ${esc(gateSummary(prev))}</div>` : ''}
         ${bestLine ? `<div class="best">★ ${esc(bestLine)}</div>` : ''}
         ${passed ? '<div class="done">✔</div>' : ''}`);
      if (unlocked) card.onclick = () => Screens.play(def.id);
      grid.append(card);
    });
    w.append(grid);
    const back = el('button', 'btn', '◂ Stages'); back.style.marginTop = '22px';
    back.onclick = () => Screens.stages();
    w.append(back);
    s.append(w);
  },

  play(id) {
    if (!Save.isUnlocked(id)) { UI.toast('That level is still locked.'); return; }
    const lv = levelAt(id);
    [Stage1, Stage2, Stage3, Stage4][lv.stage - 1].start(lv);
  }
};
