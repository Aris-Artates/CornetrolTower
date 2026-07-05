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
    const mkKey = (cell, side, row, col, thumb) => {
      const k = el('div', 'key' + (thumb ? ' thumb' : ''));
      if (cell.blank) { k.classList.add('blank'); k.textContent = ''; return k; }
      if (cell.trans) { k.classList.add('transparent'); k.textContent = '▽'; return k; }
      k.append(el('span', null, esc(cell.l)));
      if (cell.sub) k.append(el('span', 'sub', esc(cell.sub)));
      if (cell.held) k.classList.add('hold');
      if (hit(needs, side, row, col)) k.classList.add('need');
      if (hit(holds, side, row, col)) k.classList.add('hold');
      return k;
    };
    const half = (side) => {
      const h = el('div', 'kb-half ' + (side === 'L' ? 'left' : 'right'));
      const rows = side === 'L' ? L.left : L.right;
      rows.forEach((r, ri) => {
        const rowEl = el('div', 'kb-row');
        r.forEach((c, ci) => rowEl.append(mkKey(c, side, ri, ci, false)));
        h.append(rowEl);
      });
      const th = el('div', 'kb-thumbs');
      (side === 'L' ? L.leftThumbs : L.rightThumbs).forEach((c, ci) => th.append(mkKey(c, side, 'T', ci, true)));
      h.append(th);
      return h;
    };
    body.append(half('L'), half('R'));
    this.root.append(body);
  }
};
