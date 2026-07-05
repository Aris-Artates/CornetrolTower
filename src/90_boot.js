/* ── boot ───────────────────────────────────────────────────────── */
Save.load();
UI.init();
Keys.install();
Guide.init();
document.addEventListener('pointerdown', () => Sound.musicStart(), { once: true });
document.addEventListener('keydown', () => Sound.musicStart(), { once: true });
Screens.menu();
if (!Save.canStore) UI.toast('Heads-up: storage is unavailable, progress lives only in this session.');
