# Spec 70 — Fuel-log card: a quieter "Locked" note

**Status: Complete — implemented 2026-11-09 (code only; not run on a device).**

## Why

"In fuel log card, make this text small and a bit make the current color a bit light /
reduce the opacity: `Locked — part of a closed mileage period (4 Nov → 4 Nov)`" — then
"make the text a bit more small". The locked-period note read as a loud amber alert; it's a
passive "this can't be edited" hint, so it should recede.

## What

`components/main/FuelLog/FuelLogCard.tsx`, the `lockedNote` style only:

- font size **11.5 → 10**,
- font weight **500 → 400**,
- added **`opacity: 0.7`** to lighten the amber (`COLORS.warning`) without changing the hue.

The note text, its `numberOfLines={2}`, and the lock behaviour (edit/delete disabled on a
locked log) are unchanged.

## Cascade

App-only, style-only. No server, no web.

## Verify (not run on a device)

- V1 — a locked fuel log's note reads small and dimmed, no longer a bright amber line.
- V2 — the lock still disables edit/delete; only the note's appearance changed.
