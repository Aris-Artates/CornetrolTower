/* ════════════════════════════════════════════════════════════════
   CONFIG — every numeric difficulty value lives here (tunable).
   ════════════════════════════════════════════════════════════════ */
const CONFIG = {
  storageKey: 'cornetrol-tower-save-v1',
  links: { discord: 'https://discord.gg/your-server-here', facebook: 'https://facebook.com/your-page-here' },
  audio: { master: 0.8, music: 0.35, sfx: 0.7 },

  stages: [
    { num: 1, title: 'Flight School',       job: 'Typing cadet',          layer: 'Layer 0 — Dvorak base',  reuse: '—' },
    { num: 2, title: 'Security Checkpoint', job: 'X-ray officer',         layer: 'Layer 1 — NAV & mouse',  reuse: 'Layer 0' },
    { num: 3, title: 'Maintenance Bay',     job: 'Software engineer',     layer: 'Layer 2 — SYM',          reuse: 'Layers 0, 1' },
    { num: 4, title: 'Corne-trol Tower',   job: 'Air traffic controler',layer: 'Layer 3 — FN',           reuse: 'Layers 0, 1' }
  ],

  /* ── Stage 1 ──────────────────────────────────────────────────── */
  stage1: [
    { id:'1-1', name:'Home row keys',  gate:{wpm:12, acc:92}, gen:'bursts',    testChars:90,  strict:false,
      newKeys:['a','o','e','u','i','d','h','t','n','s'] },
    { id:'1-2', name:'Home row words', gate:{wpm:18, acc:92}, gen:'homeWords', testChars:110, strict:false, newKeys:[] },
    { id:'1-3', name:'Top row',        gate:{wpm:20, acc:93}, gen:'topWords',  testChars:130, strict:false,
      newKeys:["'",',','.','p','y','f','g','c','r','l'] },
    { id:'1-4', name:'Bottom row',     gate:{wpm:22, acc:93}, gen:'botWords',  testChars:140, strict:false,
      newKeys:[';','q','j','k','x','b','m','w','v','z'] },
    { id:'1-5', name:'Full alphabet + capitals', gate:{wpm:25, acc:94}, gen:'pangrams', testChars:160, strict:true,
      newKeys:['A','U','H','S'] },   // warm-up demos HRM-shift capitals
    { id:'1-6', name:'Graduation exam', gate:{wpm:28, acc:95}, gen:'exam', testChars:180, strict:true,
      newKeys:['Tab','Escape','-','/'] }
  ],

  /* ── Stage 2 ──────────────────────────────────────────────────── */
  stage2: [
    { id:'2-1', name:'First shift',    bags:6,  beltSpeed:34, itemsPerBag:[2,3], maxFalse:2, nameAcc:85, time:150, pool:'short', lookalikes:false, containerDepth:0 },
    { id:'2-2', name:'Decoy trays',    bags:8,  beltSpeed:40, itemsPerBag:[3,4], maxFalse:2, nameAcc:88, time:170, pool:'short', lookalikes:true,  containerDepth:0 },
    { id:'2-3', name:'Open that bag',  bags:8,  beltSpeed:38, itemsPerBag:[3,4], maxFalse:2, nameAcc:88, time:210, pool:'short', lookalikes:true,  containerDepth:1 },
    { id:'2-4', name:'Deep inspection',bags:9,  beltSpeed:42, itemsPerBag:[3,4], maxFalse:2, nameAcc:88, time:240, pool:'long',  lookalikes:true,  containerDepth:2 },
    { id:'2-5', name:'Rush hour',      bags:12, beltSpeed:58, itemsPerBag:[3,5], maxFalse:1, nameAcc:90, time:220, pool:'long',  lookalikes:true,  containerDepth:2 }
  ],

  /* ── Stage 3 ──────────────────────────────────────────────────── */
  stage3: [
    { id:'3-1', name:'One-line fixes',   time:300, firstPass:60 },
    { id:'3-2', name:'Literal overhaul', time:360, firstPass:60 },
    { id:'3-3', name:'Comment surgery',  time:360, firstPass:60 },
    { id:'3-4', name:'Two-file job',     time:420, firstPass:65 },
    { id:'3-5', name:'The full ticket',  time:540, firstPass:65 },
    { id:'3-6', name:'Syntax sprint',    mode:'flow', gate:{wpm:24, acc:93}, groups:34,
      layers:[0, 2, 3], difficulty:'normal' }   // Monkeytype-style code flow-typing
  ],

  /* ── Stage 4 ──────────────────────────────────────────────────── */
  stage4: [
    { id:'4-1', name:'First approach', tags:4,  land:6,  maxWrong:2, fuel:75, spawnEvery:6.5, speed:[7,11],  dup:false, initial:3, maxPlanes:5, reshuffle:false, numpad:false },
    { id:'4-2', name:'Busy skies',     tags:8,  land:8,  maxWrong:2, fuel:70, spawnEvery:5.5, speed:[8,12],  dup:false, initial:4, maxPlanes:6, reshuffle:false, numpad:false },
    { id:'4-3', name:'Twin signals',   tags:6,  land:8,  maxWrong:2, fuel:70, spawnEvery:5.0, speed:[8,13],  dup:true,  initial:4, maxPlanes:6, reshuffle:false, numpad:false },
    { id:'4-4', name:'Full board',     tags:12, land:10, maxWrong:2, fuel:60, spawnEvery:4.2, speed:[9,14],  dup:true,  initial:5, maxPlanes:7, reshuffle:false, numpad:true },
    { id:'4-5', name:'Storm shift',    tags:12, land:12, maxWrong:1, fuel:45, spawnEvery:3.6, speed:[10,15], dup:true,  initial:5, maxPlanes:8, reshuffle:true,  numpad:true }
  ],
  numpadChance: 0.35,   // odds a 4-4/4-5 landing asks for a heading (FN numpad)

  /* ── Code-type engine (Stage 3 flow level + Practice minigame) ──── */
  codetype: {
    // difficulty presets: gib = gibberish ratio, code = real-code-line ratio,
    // navRate = chance of a NAV key token per group, wordLen = gibberish length
    difficulties: {
      easy:   { label: 'Easy',   gib: 0.12, code: 0.25, navRate: 0.05, wordLen: [3, 6] },
      normal: { label: 'Normal', gib: 0.28, code: 0.42, navRate: 0.10, wordLen: [3, 8] },
      hard:   { label: 'Hard',   gib: 0.45, code: 0.58, navRate: 0.16, wordLen: [4, 10] },
      insane: { label: 'Insane', gib: 0.62, code: 0.72, navRate: 0.22, wordLen: [5, 13] }
    },
    wordCounts: [25, 50, 100],   // "words" length options
    times: [15, 30, 60],         // timed length options (seconds)
    codeWordWeight: 3            // a code line counts as this many "words" toward length
  }
};

/* ════════════════════════════════════════════════════════════════
   CONTENT — word pools and X-ray item catalogue.
   ════════════════════════════════════════════════════════════════ */
const CONTENT = {
  homeLetters: ['a','o','e','u','i','d','h','t','n','s'],
  homeWords: ('the that this then than these those and an at as is it in on no not note notes need does did dad add '
    + 'hat hot hit sit sat set sent send tent tone tune dine nine none noon nose soon seen teen thin thus oath into '
    + 'unto undo unit audio audit south shout house hands stand stood instead station sustain distant honest hidden '
    + 'sudden tissue statue saint stain satin ideas').split(' '),
  topWords: ('flight pilot cargo radar plane place clear copy type paper price group grape carpet copper proper pretty '
    + 'culture capture picture practice gate gates depart report airport control landing captain propeller altitude '
    + 'approach chart charter cleared hangar together another aircraft traffic capital yesterday').split(' '),
  topPunct: ["don't","can't","isn't","they're","pilot's","gate,","clear.","hold,","taxi."],
  botWords: ('quiz jazz jumbo cabin quick black boxes work walk wing wings winter zebra blizzard baggage buzzer jacket '
    + 'cockpit crew maximum expect examine squawk mayday wind gusty bumpy jetway visibility very moved size dozen').split(' '),
  pangrams: [
    'The quick brown fox jumps over the lazy dog.',
    'Pack my box with five dozen liquor jugs.',
    'Jack quietly moved up front and seized the big ball of wax.',
    'Amazingly few discotheques provide jukeboxes.',
    'Sphinx of black quartz, judge my vow.',
    'Delta Victor Kilo requests taxi to the active runway.',
    'Whiskey Tango Foxtrot clears the frozen apron just by noon.',
    'Quick zephyrs blow, vexing daft Jim.'
  ],
  // \t = Tab token · \x1b = Esc token · lines end with an Enter token
  examLines: [
    '\tcheck-in opens; the crew boards the red-eye to Quebec.',
    '\x1babort pushback; a fuel/oil check is required now.',
    'The tower cleared flight X-ray for the north-south runway.',
    '\tbaggage sizers accept carry-on and checked items alike.',
    'Pilots log take-off and touch-down times in the day/night book.',
    '\x1bhold short; a go/no-go call comes from Dispatch.'
  ],

  /* X-ray items. Red vs safe differ by BADGE SHAPE (▲ vs ●), never color alone. */
  xray: {
    redShort: [
      { name:'gun', glyph:'🔫' }, { name:'knife', glyph:'🔪' }, { name:'axe', glyph:'🪓' },
      { name:'bomb', glyph:'💣' }, { name:'taser', glyph:'⚡' }, { name:'blade', glyph:'🗡️' },
      { name:'flare', glyph:'🧨' }, { name:'scissors', glyph:'✂️' }, { name:'hammer', glyph:'🔨' },
      { name:'wrench', glyph:'🔧' }, { name:'saw', glyph:'🪚' }
    ],
    redLong: [
      { name:'ceramic blade', glyph:'🗡️' }, { name:'power bank', glyph:'🔋' },
      { name:'pepper spray', glyph:'🧴' }, { name:'gas canister', glyph:'⛽' },
      { name:'box cutter', glyph:'🔪' }, { name:'lighter fluid', glyph:'🧯' },
      { name:'drone battery', glyph:'🔋' }, { name:'signal flare', glyph:'🧨' }
    ],
    safe: [
      { name:'lipstick', glyph:'💄' }, { name:'keys', glyph:'🔑' }, { name:'wallet', glyph:'👛' },
      { name:'phone', glyph:'📱' }, { name:'laptop', glyph:'💻' }, { name:'book', glyph:'📖' },
      { name:'socks', glyph:'🧦' }, { name:'camera', glyph:'📷' }, { name:'lotion', glyph:'🧴' },
      { name:'teddy bear', glyph:'🧸' }, { name:'charger', glyph:'🔌' }, { name:'headphones', glyph:'🎧' },
      { name:'umbrella', glyph:'☂️' }, { name:'glasses', glyph:'👓' }, { name:'watch', glyph:'⌚' },
      { name:'cookies', glyph:'🍪' }
    ],
    // look-alike decoys: glyphs that rhyme visually with contraband
    lookalikeSafe: [
      { name:'banana', glyph:'🍌' }, { name:'pen', glyph:'🖊️' }, { name:'charger', glyph:'🔌' },
      { name:'camera', glyph:'📷' }, { name:'glasses', glyph:'👓' }, { name:'toy plane', glyph:'✈️' }
    ],
    containers: [
      { name:'purse', glyph:'👜' }, { name:'pouch', glyph:'👝' },
      { name:'backpack', glyph:'🎒' }, { name:'camera bag', glyph:'📸' }
    ]
  }
};
