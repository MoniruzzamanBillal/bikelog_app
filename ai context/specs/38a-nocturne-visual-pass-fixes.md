# 38a: Nocturne visual-pass fixes (follow-up to spec 38)

## Status

✅ Complete (2026-09-27). Fixes defects found by spec 38's own Verify step — the
Expo-web screenshot pass at 375×812 with every API call mocked. Scope is only
these defects; no new features, no data-flow changes.

## How they were found

`yarn web` + a Playwright script (session scratchpad `shots.py`) that seeds the
`token`/`user` AsyncStorage keys through `localStorage` and fulfils every
`https://bikelog-server.vercel.app/api/**` request with fixtures shaped per
`types/*.types.ts`. Nothing reached the production API.

## Defects

### A. Bar charts overflow their panel at phone width

- **Where**: `Spending.tsx` `TrendTab`, `Mileage/MileageTrendTab.tsx`, and (at 12
  months) `Mileage/YearlyMileageTab.tsx`.
- **Symptom**: on the two 6-month trend charts, the last (current-month) bar and
  its value label run past the panel's right padding and get clipped at 375pt.
- **Cause**: gifted-charts lays bars out at fixed pixel sizes. The panel's inner
  width is `375 − 2×16 page − 2×1 border − 2×16 panel padding = 309pt`, but
  `yAxisLabelWidth (~40) + initialSpacing 10 + 6×30 bars + 5×20 spacing` needs
  ~330pt. The yearly chart (`14 + 10` per bar) fits the fixture's 9 months, but a
  full year needs ~336pt.
- **Fix**: size the bars to fit 309pt, and pin `yAxisLabelWidth` so the sum is
  deterministic:
  - trend charts: `barWidth 24`, `spacing 16`, `initialSpacing 8`,
    `endSpacing 8`, `yAxisLabelWidth 34` → `34 + 8 + 6×24 + 5×16 + 8 = 274pt`.
  - yearly chart: `barWidth 12`, `spacing 9`, `initialSpacing 8`,
    `endSpacing 8`, `yAxisLabelWidth 34` → `34 + 8 + 12×12 + 11×9 + 8 = 293pt`.

### B1. `ImagePickerField`: uploaded image invisible, placeholder not centred

- **Where**: `components/main/shared/ImagePickerField.tsx` (every service,
  product and receipt thumb).
- **Symptom**: a thumb with an uploaded image renders as an empty `surface3`
  square; an empty thumb's camera/plus icon sits at the top instead of centred.
  `MultiImagePickerField` renders the same mock image correctly.
- **Cause**: the inner `TouchableOpacity` (react-native-gesture-handler) is sized
  `width/height: "100%"`. RNGH wraps it in its own container, so on web the
  percentage resolves against a collapsed box: the `Image` gets 0 height and the
  placeholder's centring has no height to centre in. `MultiImagePickerField`
  works because its touchables use explicit pixel sizes.
- **Fix**: give the touchable the explicit tile size (`{ width: size, height: size }`)
  instead of percentages — correct on both web and native.

### B2. `ImagePickerField`: floating badges misplaced at 56pt

- **Where**: same component, as used at `size={56}` by `MaintenanceLogCard` and
  `BikeAccessoryCard`.
- **Symptom**: the pencil/close badges sit well above the thumb and overlap the
  card's top edge.
- **Cause**: the badges use a fixed `top: -75`, tuned (and verified on-device in
  spec 29) for the original 64pt tile. Spec 38 introduced smaller sizes but only
  swapped badges for an action sheet below 48pt.
- **Fix**: raise `COMPACT_BELOW` from 48 to 64, so **any** non-default size uses
  the single native action sheet (View / Replace / Delete) instead of badges.
  The 56pt mockup thumbs have no badges anyway, and the verified 64pt geometry is
  left exactly as it was — nothing uses 64 with badges differently than before.

### C. `FormField` text sits ~16pt further in than every other field

- **Where**: `components/main/shared/FormField.tsx` (every text/number field: all
  form modals, auth, settings add forms).
- **Symptom**: typed text and placeholders start ~28pt from the box edge, while
  `DatePickerField` and `SelectPickerField` in the same form start at 12pt — e.g.
  the fuel form's "Odometer" and "Date" boxes don't line up.
- **Cause**: Paper's flat `TextInput` adds its own computed inner horizontal
  padding on top of the box's `paddingHorizontal: 12`. The input style's
  `padding: 0` doesn't reach it — `TextInputFlat` only honours a numeric
  `paddingHorizontal` in `style` (it replaces the computed `paddingLeft`/`Right`).
- **Fix**: add `paddingHorizontal: 0` to `FormField`'s input style, so the box's
  12pt is the only inset — matching the other two field types.

## Verify

> Gotcha hit while verifying: Metro's file watcher in this checkout (path
> contains spaces) did **not** pick up edits made while `expo start` was
> running — it kept serving the old module. Restart with `--clear` after
> editing, and confirm by grepping the served bundle before trusting a
> screenshot.

- [x] `npx tsc --noEmit` clean; `yarn lint` clean (0 warnings, same as baseline).
- [x] Guardrail-1 data-flow audit: no hook/URL/payload changes.
- [x] Re-ran the mocked 375×812 screenshot pass: both trend charts and the yearly
      chart sit inside their panels; service/product/receipt thumbs show the
      uploaded image and a centred placeholder; no badges at 56pt; `FormField`
      text aligns with date/select fields.
- [ ] Real-device pass (still owed from spec 38 itself): confirm the action sheet
      on 32/56pt thumbs and chart sizing on a physical phone.
