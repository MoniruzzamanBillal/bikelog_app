# 55a: Compact the tank forecast card, and always show the date

Status: ✅ **Complete** (2026-10-14). Requested directly by the developer after seeing spec 55 on a device.
Scope: `components/main/FuelLog/TankForecastCard.tsx` only — copy and typography. **No change to `hooks/useTankForecast.ts`**, no new field, no server change, no new request.
Supersedes spec 55 §E's copy table and the card's type scale. Every hazard and decision in spec 55 stands unchanged — in particular H-A, H-F, H-G and H-J, each of which constrains what this pass was allowed to cut.

---

## The two complaints

> "in the forecast you show a long text, make the text a bit small and give precise information, another thing is i told you to show an estimated date when my fuel will be half"

**1. The date was conditional, and hidden exactly where it was most wanted.** Spec 55 §E's copy table branches the headline on `daysToHalf`:

```ts
if (daysToHalf <= 0) return "Half tank any time now";
if (daysToHalf === 1) return "Half tank around tomorrow";
if (daysToHalf < 7)  return `Half tank in about ${daysToHalf} days`;
return `Half tank around ${format(halfDate, "d MMM")}`;   // <- only past 7 days
```

So the card printed a date **only when the tank was more than a week from half**, and substituted a relative phrase under that. The near horizon is the actionable one — a rider planning the week needs `17 Oct`, not `in about 3 days` — and spec 55's own request (`../new Features/04-half-tank-forecast.md`) asked for a date, not a countdown. `halfDate` was already computed and carried on the `live` state; it was simply discarded in four of five cases.

**2. Six text rows, three of them near-duplicates.** The non-`pastHalf` live state rendered: heading, headline, sub, and three audit lines, then a footnote. `You can ride ~240 km on half a tank` and `Based on 40.2 km/L (exact)` were split across two lines *because* they did not fit one — but 13 of those characters (`You can ride `, `Based on `) carried no information. Sizes ran 15 / 12.5 / 11.5px, large for a read-only forecast sitting above the fuel-log list.

## The fix

**Date first, relative second.** The headline is `Half tank ~ 17 Oct` in every live state that has a `halfDate`, at every horizon. The relative phrasing moves to the sub-line, where it glosses the date instead of replacing it: `in 3 days · ~154 km to go`, with `today` and `tomorrow` for 0 and 1 (`in 0 days` is not English). The `km to go` figure merges into that same line rather than owning one.

Three constraints from spec 55 survived this pass intact and are why the copy is not shorter still:

- **The `~` stays** (H-A/H-F). `currentOdometer` only advances on a log or the Settings panel, so the card reports more fuel than the bike has and the date sits late. The hedge is the mitigation, not decoration — `Half tank 17 Oct` would be a measurement-shaped lie. It moved from the word `around` to the symbol `~`, which is the same claim in one character and already the card's convention for every other figure.
- **No weekday name** (H-G). `Half tank ~ Fri 17 Oct` was drafted and rejected: the Dhaka weekend is Friday–Saturday and may be the rider's non-riding days, so a named weekend day asserts drain on a day the tank may not drain.
- **The audit lines stay, and the gauge footnote stays** (H-J, D7). H-F guarantees this card will eventually be visibly wrong; the audit block is what lets the rider see *why* rather than distrust the feature. They were shrunk and merged, not dropped.

Copy, after:

| State | Lines |
| --- | --- |
| `live`, not past half | `Half tank ~ 17 Oct` / `in 3 days · ~154 km to go` / `86 km since 1 Oct full tank` / `~240 km on half a tank · 40.2 km/L (exact)` / `Half the fuel, not the gauge.` |
| `live`, no `kmPerDay` | `~154 km to go` (promoted, §E's existing rule) / sub hidden / the same two audit lines / footnote |
| `live`, past half | `Past half tank` / the same two audit lines / footnote |
| `range-only` | `~240 km on half a tank` / `40.2 km/L (exact)` / `Mark a fill-up as a full tank to get the date.` / footnote |

Six rows become four in the common case. `your` left `86 km since your 1 Oct full tank`, and `Half the fuel, not half the gauge.` lost its second `half`.

**Type scale**, every value down: heading 11 → 10, headline 15 → **13.5**, sub 12.5 → 11, range 13.5 → 12.5, audit 11.5 → **10**, footnote 10.5 → 9.5, nudge 11.5 → 10.5. Vertical rhythm tightened with it (`paddingVertical` 12 → 11, `gap` 2 → 1, `auditBlock.marginTop` 8 → 6).

**The merge is what the 10px audit size buys.** Spec 55's §E note — _"combined they run to ~54 characters, which does not fit a 12px line at 360dp"_ — was correct for its own copy. At 10px with `You can ride ` and `Based on ` gone, the pair is **42 characters** (~220dp of a ~300dp text column), so `rangeAndBasis` is one line in both states that show it. That note in the source is replaced, not merely overruled.

## Verification

`yarn lint` clean, `npx tsc --noEmit` clean. The four copy functions were sliced verbatim out of the source and driven through the horizons that branch — 0, 1, 3 and 9 days, plus `halfDate: null`:

```
0 days   | Half tank ~ 14 Oct     | today · ~12 km to go
1 day    | Half tank ~ 15 Oct     | tomorrow · ~40 km to go
3 days   | Half tank ~ 17 Oct     | in 3 days · ~154 km to go
9 days   | Half tank ~ 23 Oct     | in 9 days · ~1,240 km to go
no rate  | ~154 km to go          | (sub hidden)
audit: ~240 km on half a tank · 40.2 km/L (exact) (42 chars)
```

Headline is ≤18 characters at every horizon (was up to 25). Thousands separators and the `null`-date fallback both hold.

**Owed:** a 360dp device look — spec 55's **V16**, which this pass makes easier to pass but does not discharge, since the character counts above are arithmetic, not measurement. Spec 55's **V6** and **V15** are unaffected and still owed.
