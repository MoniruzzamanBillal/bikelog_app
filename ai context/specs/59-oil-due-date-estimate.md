# 59: The oil card always shows a date

Status: ✅ **Implemented 2026-10-19.** Verified to the static floor only: `npx tsc --noEmit` clean, `yarn lint`
clean. **Not run on a device, and the three new states cannot appear until `bikelog_server` spec 56 is
deployed** — the fields they render do not exist on today's API, and the card falls back to exactly its
spec 57 behaviour when they are absent, so shipping this half first is harmless but invisible.

Requested directly by the developer (2026-10-19): *"in engine oil page, in the first stat section, i told you
to give possible date of the engine oil change. you did not do it."*

**The date was built** — spec 57 §B renders `Next change ~ 12 Nov` — but only in one of the four states
`/engine-oil-logs/status` can answer with. In the other three the card showed a distance, or a nudge, and no
date; the developer is looking at one of those. Which one is worth knowing before touching this:

| What the server sends | What the card showed before this spec |
| --- | --- |
| A change with **no `intervalKmUsed`** (anything logged before spec 54 seeded it, plus the §H imported rows) | *"2,000 km on this oil"* + *"Set an interval on this change to get a due date."* — **the most likely one**, and `../../CLAUDE.md` already warns specs 53/54/55 are "largely invisible" until the catalog catch-up is done |
| **No riding rate** (under 2 fuel logs in 28 days, span under 14 days, or under 100 km) | *"~1,000 km to go"* |
| **Overdue** | *"400 km past due"* |

Scope: **one file**, `components/main/EngineOilLog/OilStatusCard.tsx`, plus the three field additions to
`types/engine-oil-log.types.ts`. No new component, no new query, no new dependency — all three states are
answered by fields the server now sends on the endpoint the card already reads. Companion:
`bikelog_server/context/specs/56-oil-due-date-always.md`.

---

## §0 Hazards — read before writing code

**H-A — H-B from spec 57 still stands and this spec does not weaken it: the app computes NO projection.**
Every date, day count and percentage rendered here comes off `/status`. Two sources of truth for one figure
disagree on the same screen and the disagreement is invisible until the rider reports it (spec 53 H-E). In
particular, do **not** reach for `useTankForecast`'s `computeKmPerDay` on this screen — the contrast with
spec 55 (where client-side arithmetic *is* allowed) is that there the server computes no tank forecast at all.

**H-B — the estimate is not the same kind of fact as the rest of the card.** It is derived from the oil
type's *current* `suggestedIntervalKm`, so editing the catalog moves it, and it will disagree with the frozen
figure the moment a real interval is set. Every line it produces therefore carries `est.`, and the card ends
with the one sentence that makes it exact. Never merge it into the unlabelled lines.

**H-C — `projectedDueDate` is a genuine instant, not one of the backend's UTC-midnight date-only fields**, in
the overdue and estimate cases exactly as in the forecast case. `toDate` (`new Date(value)` + a `NaN` guard),
never `parseApiDate`, which would read its UTC calendar day — a day behind Dhaka local between 00:00 and 06:00.

**H-D — `kmRemaining` is signed and unclamped**, unlike the reminders endpoint's `Math.max(0, …)`. Take its
absolute value for the overdue lines; never reconstruct the overshoot from `currentOdometer -
nextDueOdometer`, which `getDistanceLine` has to do and which would double-count it here.

**H-E — the card must degrade to spec 57's behaviour on an older server.** All three additions are optional
fields; when they are absent the branches that read them are unreachable and the rendering is unchanged. This
is what makes the deploy order free in both directions.

---

## §A Design decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | **Overdue gets the headline** *"Was due ~ 3 Oct"*, with *"12 days past due · ~400 km past due"* under it | A date is the only form that tells the rider *how stale* the oil is in units they think in; 400 km needs mental arithmetic against their own riding. The distance stays, one line down, because it is the figure that is actually measured rather than projected |
| D2 | The overdue sub-line renders **only when the date carried the headline** | With no rate there is no date, the headline falls back to the distance, and a sub-line would just repeat it |
| D3 | When `estimate` is present it drives the **whole** card — headline, sub-line, progress bar, pill and the first audit line — not just the headline | Half-estimated is worse than either: a bar filled from a real interval beside a date from a guessed one is unreadable. The pill gains `· est.` so the state is visible without reading the body |
| D4 | The estimate ends with one sentence naming its source: *"Estimated from Motul 7100's 3,000 km interval — set one on this change to make it exact."* | H-B, and it doubles as the fix instruction. It replaces spec 57's bare nudge, which told the rider what was missing but showed them nothing |
| D5 | `kmPerDay` gains a **basis suffix** in the audit line — ` long-run avg` / ` lifetime avg` — driven by `rateBasis.source` | A date projected off a lifetime average is a different quality of claim from one projected off last month's riding. The rider can only judge the date if they know what it was measured over. `"recent"` gets no suffix, so the common case reads exactly as it does today |
| D6 | The spec 57 nudge survives for the one case with **nothing to project from** — no stored interval *and* no oil type | There is genuinely no answer to give, and the nudge is the fix. `kmSinceChange` still carries the headline |
| D7 | No new styles: the estimate sentence reuses `styles.nudge`, the overdue sub-line reuses `styles.sub` | D14's type scale was device-measured in spec 57 and floored at 10px. Nothing here earns a second pass down |
| D8 | The status pill keeps its four-valued tone mapping, keyed on the **estimate's** status when one is driving | H-H from spec 57: this card is the screen's alert surface, and an estimated `overdue` is still worth the danger tone — flagged `est.` rather than hidden |

---

## §B The states, after this spec

| Server state | Headline | Under it |
| --- | --- | --- |
| `ok` / `upcoming`, rate available | `Next change ~ 12 Nov` | `in 25 days · ~1,000 km to go` |
| `ok` / `upcoming`, **no strict rate** | `Next change ~ 23 Jan` (from the fallback rate) | `in 95 days · ~1,000 km to go`, and the audit line says `10.4 km/day long-run avg` |
| `overdue` | `Was due ~ 3 Oct` (danger) | `12 days past due · ~400 km past due` |
| **No interval, estimate present** | `Next change ~ 12 Nov` with the pill reading `On track · est.` | `in 25 days · ~1,000 km to go`, the audit line `2,000 / 3,000 km on this oil · 67% · est.`, and D4's sentence |
| No interval, **no** oil type | `2,000 km on this oil` | the spec 57 nudge |
| No rate at all (new bike) | `~1,000 km to go` | — (unchanged) |
| No oil log at all | the card renders nothing (spec 57 §B row 1) | — |

---

## §C Verify

| # | Check | State |
| --- | --- | --- |
| V1 | The developer's own bike shows a **date** in the state it is actually in — the whole point of the spec | ⬜ device, after the server deploy |
| V2 | A change with no interval shows the estimated date, the `est.` pill, and D4's sentence naming the oil type | ⬜ device |
| V3 | Setting a real interval on that change replaces the estimate with the unlabelled forecast, and the two agree within rounding | ⬜ device |
| V4 | An overdue change reads `Was due ~ <date>` in danger tone, with the day count and the distance under it | ⬜ device |
| V5 | A bike with thin fuel history shows a date and the ` lifetime avg` / ` long-run avg` suffix | ⬜ device |
| V6 | A bike with normal fuel history reads **exactly** as it did before this spec (no suffix, no `est.`) | ⬜ device |
| V7 | The progress bar fills from the estimate's `percentUsed` and is clamped at 100 | ⬜ device |
| V8 | A Settings odometer update (spec 44) moves every figure on the next refetch, estimate included | ⬜ device |
| V9 | Against the **pre-spec-56** server the card renders exactly as spec 57 left it (H-E) | ⬜ device, before the server deploy |
| V10 | 360dp width: no line wraps badly, the pill's `· est.` does not push the heading | ⬜ device |
| V11 | `npx tsc --noEmit` and `yarn lint` clean | ✅ |
