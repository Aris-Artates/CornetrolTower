#!/bin/sh
# Concatenate the src modules into the single self-contained deliverable.
cd "$(dirname "$0")"
cat src/00_head.html \
    src/10_keymap.js \
    src/15_config.js \
    src/20_core.js \
    src/30_guide.js \
    src/35_screens.js \
    src/40_stage1.js \
    src/45_tickets.js \
    src/50_stage2.js \
    src/55_codetype.js \
    src/60_stage3.js \
    src/70_stage4.js \
    src/90_boot.js \
    src/99_tail.html > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
