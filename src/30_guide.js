/* ════════════════════════════════════════════════════════════════
   GUIDE — the always-available live Corne board (ground rule 4).
   Shows the layer currently needed, highlights the exact next
   key(s), marks required thumb holds, labels GACS home-row mods.
   ════════════════════════════════════════════════════════════════ */
const Guide = {
  root: null, state: { layer: 0, needs: [], holds: [], text: 'Dvorak base layer' },
  init() {
    this.root = document.getElementById('guide');
    if (!Save.data.settings.guideOpen) this.root.classList.add('folded');
    this.render();
  },
  toggle() {
    this.root.classList.toggle('folded');
    Save.data.settings.guideOpen = !this.root.classList.contains('folded');
    Save.persist();
    this.render();
  },
  set(state) {
    this.state = Object.assign({ layer: 0, needs: [], holds: [], text: '' }, state);
    this.render();
  },
  idle(text) { this.set({ layer: 0, needs: [], holds: [], text: text || 'Dvorak base layer — GACS mods on A O E U · H T N S' }); },
  forChar(ch, label) {
    const h = KEY.hint(ch, label);
    if (!h) { this.idle(); return; }
    const holds = [];
    if (h.holdThumb) holds.push(h.holdThumb);
    if (h.shiftKey) holds.push(h.shiftKey);
    this.set({ layer: h.layer, needs: h.needs, holds, text: h.text });
  },
  forKeyName(k, label) { this.forChar(k, label); },
  // several keys on one layer (e.g. NAV mouse cluster, arrows)
  forCluster(layerIdx, keyNames, text) {
    const needs = [], holds = [];
    keyNames.forEach(k => { const h = KEY.hint(k); if (h) { needs.push(...h.needs); if (h.holdThumb && !holds.length) holds.push(h.holdThumb); } });
    this.set({ layer: layerIdx, needs, holds, text });
  },
  render() {
    const { layer, needs, holds, text } = this.state;
    const folded = this.root.classList.contains('folded');
    this.root.innerHTML = '';
    const head = el('div', 'g-head',
      `<span class="g-title">Corne guide</span>
       <span class="g-layer">LAYER ${layer} — ${esc(KEYMAP.layerNames[layer])}</span>
       <span class="g-hint">${esc(text)}</span>
       <span class="g-fold">${folded ? '▲ show' : '▼ hide'}</span>`);
    head.onclick = () => this.toggle();
    this.root.append(head);
    if (folded) return;

    const body = el('div', 'g-body');
    const L = KEYMAP.layers[layer];
    const hit = (list, side, row, col) => list.some(p => p.side === side && String(p.row) === String(row) && p.col === col);
    const mkKey = (cell, side, row, col, kind) => {
      const k = el('div', 'key' + (kind === 'thumb' ? ' thumb' : '') + (kind === 'edge' ? ' edgekey' : ''));
      if (!cell || cell.blank) { k.classList.add('blank'); return k; }
      if (cell.trans) { k.classList.add('transparent'); k.textContent = '▽'; return k; }
      k.append(el('span', null, esc(cell.l)));
      if (cell.sub) k.append(el('span', 'sub', esc(cell.sub)));
      if (cell.held) k.classList.add('hold');
      if (hit(needs, side, row, col)) k.classList.add('need');
      if (hit(holds, side, row, col)) k.classList.add('hold');
      return k;
    };
    // ergonomic column stagger — "up" amounts (outer→inner for L, mirrored for R)
    const STAG_L = [10, 10, 20, 26, 14, 4], STAG_R = [4, 14, 26, 20, 10, 10], MAX = 26;
    const half = (side) => {
      const isL = side === 'L';
      const h = el('div', 'kb-half ' + (isL ? 'left' : 'right'));
      const rows = isL ? L.left : L.right;
      const thumbs = isL ? L.leftThumbs : L.rightThumbs;
      const stag = isL ? STAG_L : STAG_R;
      // 6 staggered finger columns
      const grid = el('div', 'kb-grid');
      for (let col = 0; col < 6; col++) {
        const colEl = el('div', 'kb-col');
        colEl.style.marginTop = (MAX - stag[col]) + 'px';
        for (let ri = 0; ri < 3; ri++) colEl.append(mkKey(rows[ri][col], side, ri, col, ''));
        grid.append(colEl);
      }
      // edge column of extra keys: left = inner (- / Bsp), right = outer (Bsp / ' / Del)
      const edge = el('div', 'kb-col kb-edge');
      edge.style.marginTop = (MAX - (isL ? 4 : 8)) + 'px';
      if (isL) edge.append(el('div', 'key blank'), mkKey(thumbs[0], side, 'T', 0, 'edge'), mkKey(thumbs[1], side, 'T', 1, 'edge'));
      else edge.append(mkKey(thumbs[3], side, 'T', 3, 'edge'), mkKey(thumbs[4], side, 'T', 4, 'edge'), mkKey(thumbs[5], side, 'T', 5, 'edge'));
      grid.append(edge);
      h.append(grid);
      // 3-key thumb cluster, fanned outward
      const th = el('div', 'kb-thumbs');
      const idxs = isL ? [3, 4, 5] : [0, 1, 2];
      const rot = isL ? [0, 9, 18] : [-18, -9, 0];
      idxs.forEach((ci, i) => {
        const key = mkKey(thumbs[ci], side, 'T', ci, 'thumb');
        key.style.transform = `rotate(${rot[i]}deg)`;
        th.append(key);
      });
      h.append(th);
      return h;
    };
    body.append(half('L'), half('R'));
    this.root.append(body);
  }
};
