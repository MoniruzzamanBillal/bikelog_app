# 60: Fuel logs — cost per km on every card

Status: ✅ **Implemented 2026-10-19.** Verified to the static floor only: `npx tsc --noEmit` clean, `yarn lint`
clean. **Not run on a device**, and the line stays hidden until `bikelog_server` spec 57 is deployed — both
fields are optional and guarded with `!= null`, so an older server simply renders the card as it does today.

Requested directly by the developer (2026-10-19): *"in fuel log page, can you add the per km cost, just like
the engine oil card sections in engine oil page? if you can do it, then add this."*

The line being pointed at is `EngineOilLogCard`'s last one — `1,240 km on this oil · ৳0.97/km` (spec 57 §G,
fed by `bikelog_server` spec 54 D12). Yes it can be done, and the mechanism ports directly.

Scope: **one file**, `components/main/FuelLog/FuelLogCard.tsx` (one guarded line + one style), plus the two
field additions to `types/fuel-log.types.ts`. No change to `FuelLog.tsx`, no new query, no new dependency.
Companion: `bikelog_server/context/specs/57-fuel-log-cost-per-km.md`.

---

## §0 Hazards — read before writing code

**H-A — do NOT derive this on the client, even though it looks like two subtractions.** A row's tank is closed
by its **newer** neighbour, which sits on the *previous page* at every page boundary — so a derived figure
would appear and vanish as the rider pages, exactly the defect engine oil's spec 54 V15 caught one screen
over (and `bikelog_client-web-` spec 33 H-W12 before that). The server sends both figures per list row; render
them.

**H-B — this is not mileage, and the card already shows mileage.** The km/l tag in the meta row comes from a
closed full-tank `MileageRecord` period; `costPerKm` is money over the distance this one tank covered,
partial fills included. They are different denominators over different periods and will not reconcile. Hence
the placement: the new line sits under the odometer line, not beside the km/l tag.

**H-C — guard the two fields separately, and with `!= null`.** `kmOnThisFill` can be non-null while
`costPerKm` is null — two fill-ups at the same odometer reading give `kmOnThisFill: 0`, and the server sends
`null` rather than `Infinity` for the division. Both are also absent entirely on an older server and on
`GET /:id`.

**H-D — the newest fill-up has no line at all**, because its tank is still being burned. That is correct and
deliberate, exactly as the newest oil change has no line: the `TankForecastCard` above is already the screen's
statement about the tank in progress.

---

## §A Design decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Same line, same order, same separator as `EngineOilLogCard`'s: `300 km on this tank · ৳4.00/km` | It is what the developer asked this to match. "tank", not "oil" — the only word that changes |
| D2 | Rendered only when **both** fields are non-null | H-C. A `—` placeholder is what the web's table needs to keep a column aligned; a card has nothing to align, so a dash is pure noise (spec 57 D11's reasoning) |
| D3 | `fontSize: 11.5`, `COLORS.textMuted`, tabular nums | `EngineOilLogCard` is deliberately "one notch down from `FuelLogCard` throughout" (its D14), so its 10.5 becomes 11.5 here. Both cards keep their own scale rather than converging on one |
| D4 | Under the odometer line, above `lockedNote` | H-B for the placement; above the locked note because that note is about what the rider *can't do*, which belongs last |
| D5 | Two decimals on the money, `toLocaleString()` on the distance | Same formatting as the oil card. `৳0.97/km` with one decimal would round half the realistic range to the same value |
| D6 | `FuelLog.tsx` is untouched | The fields arrive on the list rows the screen already fetches. No new prop, and in particular no second query — unlike `mileageKmPerLiter`, which has to be matched out of the mileage history |

---

## §B Verify

| # | Check | State |
| --- | --- | --- |
| V1 | Every fill-up except the newest shows `<km> km on this tank · ৳<n>/km` | ⬜ device, after the server deploy |
| V2 | The newest fill-up shows no such line | ⬜ device |
| V3 | Page 2's first row carries a figure (the off-page neighbour) rather than a gap | ⬜ device |
| V4 | The figures are consistent with two consecutive rows' odometer readings and this row's total, checked by hand once | ⬜ device |
| V5 | Two fills at the same odometer reading → no line (not `Infinity`, not `৳0.00`) | ⬜ device |
| V6 | A locked row still shows the locked note, below the new line | ⬜ device |
| V7 | Against the pre-spec-57 server the card renders exactly as it does today | ⬜ device |
| V8 | 360dp width: the line does not wrap or collide with the receipt thumbnail | ⬜ device |
| V9 | `npx tsc --noEmit` and `yarn lint` clean | ✅ |
