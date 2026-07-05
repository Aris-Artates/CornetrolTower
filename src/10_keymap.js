/* ════════════════════════════════════════════════════════════════
   KEYMAP — 46-KEY CORNE, DVORAK PROGRAMMER (v1)
   Encoded verbatim from the spec appendix. Single source of truth:
   every diagram, hint and drill reads from this structure.
   Cell: { l:label, k:output (KeyboardEvent.key), s:shifted output,
           sub:home-row-mod label, hold:layer this thumb activates,
           blank:true (no-op), trans:true (▽ transparent) }
   ════════════════════════════════════════════════════════════════ */
const KEYMAP = {
  layerNames: ['BASE', 'NAV & MOUSE', 'SYM', 'FN'],
  holdDesc: { NAV: 'left thumb · inner key', SYM: 'right thumb · middle key', FN: 'right thumb · outer key' },
  layers: [
    { // ── LAYER 0 — BASE (Dvorak) ──
      left: [
        [{l:'Tab',k:'Tab'},{l:"'",k:"'",s:'"'},{l:',',k:',',s:'<'},{l:'.',k:'.',s:'>'},{l:'P',k:'p'},{l:'Y',k:'y'}],
        [{l:'Esc',k:'Escape'},{l:'A',k:'a',sub:'GUI'},{l:'O',k:'o',sub:'Alt'},{l:'E',k:'e',sub:'Ctl'},{l:'U',k:'u',sub:'Sft'},{l:'I',k:'i'}],
        [{l:'Sft'},{l:';',k:';',s:':'},{l:'Q',k:'q'},{l:'J',k:'j'},{l:'K',k:'k'},{l:'X',k:'x'}]
      ],
      right: [
        [{l:'F',k:'f'},{l:'G',k:'g'},{l:'C',k:'c'},{l:'R',k:'r'},{l:'L',k:'l'},{l:'/',k:'/',s:'?'}],
        [{l:'D',k:'d'},{l:'H',k:'h',sub:'Sft'},{l:'T',k:'t',sub:'Ctl'},{l:'N',k:'n',sub:'Alt'},{l:'S',k:'s',sub:'GUI'},{l:'-',k:'-',s:'_'}],
        [{l:'B',k:'b'},{l:'M',k:'m'},{l:'W',k:'w'},{l:'V',k:'v'},{l:'Z',k:'z'},{l:'Sft'}]
      ],
      leftThumbs: [{l:'NAV',hold:'NAV'},{l:'Spc/Sft',k:' '},{l:'Bsp',k:'Backspace'}],
      rightThumbs: [{l:'Ent',k:'Enter'},{l:'SYM',hold:'SYM'},{l:'FN',hold:'FN'}]
    },
    { // ── LAYER 1 — NAV & MOUSE (hold left thumb / NAV) ──
      left: [
        [{trans:true},{l:'RC',k:'RC'},{l:'MU',k:'MU'},{l:'LC',k:'LC'},{l:'WU',k:'WU'},{blank:true}],
        [{trans:true},{l:'ML',k:'ML'},{l:'MD',k:'MD'},{l:'MR',k:'MR'},{l:'WD',k:'WD'},{blank:true}],
        [{trans:true},{blank:true},{l:'WL',k:'WL'},{l:'WR',k:'WR'},{blank:true},{blank:true}]
      ],
      right: [
        [{l:'Undo',k:'Undo'},{l:'Redo',k:'Redo'},{l:'Cut',k:'Cut'},{l:'Copy',k:'Copy'},{l:'Pste',k:'Paste'},{trans:true}],
        [{l:'Home',k:'Home'},{l:'←',k:'ArrowLeft'},{l:'↓',k:'ArrowDown'},{l:'↑',k:'ArrowUp'},{l:'→',k:'ArrowRight'},{l:'End',k:'End'}],
        [{l:'PgUp',k:'PageUp'},{l:'PgDn',k:'PageDown'},{l:'MC',k:'MC'},{blank:true},{blank:true},{trans:true}]
      ],
      leftThumbs: [{l:'▽▽▽',held:'NAV'},{l:'LC',k:'LC'},{l:'RC',k:'RC'}],
      rightThumbs: [{l:'Ent',k:'Enter'},{trans:true},{trans:true}]
    },
    { // ── LAYER 2 — SYM (hold right thumb / SYM) ──
      left: [
        [{l:'~',k:'~'},{l:'!',k:'!'},{l:'@',k:'@'},{l:'#',k:'#'},{l:'$',k:'$'},{l:'%',k:'%'}],
        [{trans:true},{l:'(',k:'(',sub:'GUI'},{l:'{',k:'{',sub:'Alt'},{l:'[',k:'[',sub:'Ctl'},{l:'<',k:'<',sub:'Sft'},{l:'=',k:'='}],
        [{trans:true},{l:'_',k:'_'},{l:':',k:':'},{l:';',k:';'},{l:'?',k:'?'},{l:'/',k:'/'}]
      ],
      right: [
        [{l:'^',k:'^'},{l:'&',k:'&'},{l:'*',k:'*'},{l:'\\',k:'\\'},{l:'|',k:'|'},{l:'`',k:'`'}],
        [{l:'+',k:'+'},{l:'>',k:'>',sub:'Sft'},{l:')',k:')',sub:'Ctl'},{l:'}',k:'}',sub:'Alt'},{l:']',k:']',sub:'GUI'},{l:'"',k:'"'}],
        [{l:'-',k:'-'},{l:'&',k:'&'},{l:'|',k:'|'},{l:'.',k:'.'},{l:',',k:','},{trans:true}]
      ],
      leftThumbs: [{l:'Spc',k:' '},{trans:true},{trans:true}],
      rightThumbs: [{trans:true},{l:'▽▽▽',held:'SYM'},{trans:true}]
    },
    { // ── LAYER 3 — FN (hold right thumb / FN) ──
      left: [
        [{l:'Boot'},{l:'F1',k:'F1'},{l:'F2',k:'F2'},{l:'F3',k:'F3'},{l:'F4',k:'F4'},{l:'F5',k:'F5'}],
        [{trans:true},{l:'F6',k:'F6',sub:'GUI'},{l:'F7',k:'F7',sub:'Alt'},{l:'F8',k:'F8',sub:'Ctl'},{l:'F9',k:'F9',sub:'Sft'},{l:'F10',k:'F10'}],
        [{trans:true},{l:'F11',k:'F11'},{l:'F12',k:'F12'},{l:'Prev'},{l:'Play'},{l:'Next'}]
      ],
      right: [
        [{l:'/',k:'/'},{l:'7',k:'7'},{l:'8',k:'8'},{l:'9',k:'9'},{l:'-',k:'-'},{l:'Boot'}],
        [{l:'*',k:'*'},{l:'4',k:'4',sub:'Sft'},{l:'5',k:'5',sub:'Ctl'},{l:'6',k:'6',sub:'Alt'},{l:'+',k:'+',sub:'GUI'},{l:'=',k:'='}],
        [{l:'0',k:'0'},{l:'1',k:'1'},{l:'2',k:'2'},{l:'3',k:'3'},{l:'.',k:'.'},{trans:true}]
      ],
      leftThumbs: [{l:'Vol-'},{l:'Mute'},{l:'Vol+'}],
      rightThumbs: [{l:'0',k:'0'},{l:'▽▽▽',held:'FN'},{trans:true}]
    }
  ]
};

/* ── Position lookup tables ─────────────────────────────────────── */
const KEY = (() => {
  // plainMaps[layer]: char/key -> pos ; shiftMap: shifted base output -> pos(+shift)
  const plainMaps = [new Map(), new Map(), new Map(), new Map()];
  const shiftMap = new Map();

  KEYMAP.layers.forEach((layer, li) => {
    const scan = (cells, side, row) => cells.forEach((c, col) => {
      const pos = { layer: li, side, row, col };
      if (c.k !== undefined && !plainMaps[li].has(c.k)) plainMaps[li].set(c.k, pos);
      if (li === 0 && c.s && !shiftMap.has(c.s)) shiftMap.set(c.s, { ...pos, shift: true });
      if (li === 0 && c.k && /^[a-z]$/.test(c.k)) shiftMap.set(c.k.toUpperCase(), { ...pos, shift: true });
    });
    layer.left.forEach((r, ri) => scan(r, 'L', ri));
    layer.right.forEach((r, ri) => scan(r, 'R', ri));
    scan(layer.leftThumbs, 'L', 'T');
    scan(layer.rightThumbs, 'R', 'T');
  });

  const FINGERS_L = ['pinky (outer)', 'pinky', 'ring', 'middle', 'index', 'index (inner)'];
  const FINGERS_R = ['index (inner)', 'index', 'middle', 'ring', 'pinky', 'pinky (outer)'];

  function fingerOf(pos) {
    if (pos.row === 'T') return 'thumb';
    return pos.side === 'L' ? FINGERS_L[pos.col] : FINGERS_R[pos.col];
  }
  function sideWord(pos) { return pos.side === 'L' ? 'left' : 'right'; }

  // Find a key/char. Search order: base plain → SYM → FN → base+Shift.
  function find(x) {
    for (const li of [0, 2, 3]) if (plainMaps[li].has(x)) return plainMaps[li].get(x);
    if (shiftMap.has(x)) return shiftMap.get(x);
    // NAV-only keys (arrows, Home/End, PgUp/PgDn, clipboard, mouse)
    if (plainMaps[1].has(x)) return plainMaps[1].get(x);
    return null;
  }

  function labelAt(pos) {
    const layer = KEYMAP.layers[pos.layer];
    const half = pos.side === 'L' ? layer.left : layer.right;
    const cell = pos.row === 'T'
      ? (pos.side === 'L' ? layer.leftThumbs : layer.rightThumbs)[pos.col]
      : half[pos.row][pos.col];
    return cell.l || '';
  }

  // The HRM Shift on the hand OPPOSITE the target key: U (left index) / H (right index)
  function hrmShiftFor(pos) {
    return pos.side === 'L'
      ? { layer: 0, side: 'R', row: 1, col: 1, name: 'H (right index)' }
      : { layer: 0, side: 'L', row: 1, col: 4, name: 'U (left index)' };
  }

  // Build a full hint for a character or named key.
  // Returns {layer, needs:[pos], holdThumb:pos|null, shiftKey:pos|null, text}
  function hint(x, displayLabel) {
    const pos = find(x);
    if (!pos) return null;
    const lbl = displayLabel || labelAt(pos);
    const holds = { 1: 'NAV', 2: 'SYM', 3: 'FN' }[pos.layer] || null;
    let holdThumb = null, text = '';
    if (holds) {
      const layer = KEYMAP.layers[pos.layer];
      const lt = layer.leftThumbs.findIndex(c => c.held === holds);
      const rt = layer.rightThumbs.findIndex(c => c.held === holds);
      holdThumb = lt >= 0 ? { layer: pos.layer, side: 'L', row: 'T', col: lt }
                          : { layer: pos.layer, side: 'R', row: 'T', col: rt };
      text = `Hold ${holds} (${KEYMAP.holdDesc[holds]}) · ${sideWord(pos)} ${fingerOf(pos)} → ${lbl}`;
    } else if (pos.shift) {
      const sh = hrmShiftFor(pos);
      text = `Hold Shift (${sh.name} or outer Sft) · ${sideWord(pos)} ${fingerOf(pos)} → ${lbl}`;
      return { layer: 0, needs: [pos], holdThumb: null, shiftKey: sh, text };
    } else {
      text = `${sideWord(pos)[0].toUpperCase() + sideWord(pos).slice(1)} ${fingerOf(pos)} → ${lbl}`;
    }
    return { layer: pos.layer, needs: [pos], holdThumb, shiftKey: null, text };
  }

  return { find, hint, labelAt, fingerOf, sideWord, hrmShiftFor };
})();
