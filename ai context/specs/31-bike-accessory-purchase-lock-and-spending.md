# 31: Bike Accessory Purchase Lock + Price-Required Validation (client for backend spec 25)

Status: ✅ Complete

## Goal

Client-side counterpart to `bikelog_server`'s spec 25 (and the sibling `bikelog_client-web-` spec 23). The backend added two new rules to `bikeAccessory`:

1. Once an accessory's `status` becomes `"purchased"`, it's a **permanent, one-way lock** — the API 400s any further status change.
2. `price` is **required** the instant `status` becomes `"purchased"` — 400s otherwise.
3. `purchaseDate` is a new, fully server-computed field — no new form field needed here.

Spec 15 originally added the optional `price` field to this screen and explicitly flagged wiring it into spending totals as out of scope. This spec (paired with the backend closing that gap) is a small, additive follow-up: mirror both new rules in the UI so the user gets an immediate, clear error instead of a rejected API call, and lock the status picker once it's actually locked server-side.

## Context

- `components/main/BikeAccessory/BikeAccessoryFormModal.tsx`'s `handleSubmit` validated `name` and (if present) a valid positive `price`, but had no rule requiring `price` when `status === "purchased"`.
- `components/main/shared/SelectPickerField.tsx` had no `disabled` prop at all — its `TouchableRipple` anchor was always interactive.
- `types/bike-accessory.types.ts` had no `purchaseDate` field.

## Design

**`types/bike-accessory.types.ts`** — added `purchaseDate?: string` (ISO string, output-only) to `TBikeAccessory`. Not added to either payload type — the client never sends it.

**`components/main/shared/SelectPickerField.tsx`** — added `disabled?: boolean`, passed to the anchor `TouchableRipple`'s own native `disabled` prop (react-native-paper's `TouchableRipple` already suppresses `onPress` when disabled) plus a new `touchableDisabled` style (`opacity: 0.5`) for a visible dimmed state.

**`BikeAccessoryFormModal.tsx`**:
- `isStatusLocked = !!initialAccessory && initialAccessory.status === "purchased"` → passed to the Status `SelectPickerField`'s new `disabled` prop, with a "Status is locked once purchased." hint line rendered underneath when locked.
- `handleSubmit` gained a new check, inserted after the existing price-format check: `if (status === "purchased" && !price.trim())` → shows the same `Toast.show({type: "error", ...})` pattern already used for the `name`/price-format checks, blocking submission before any API call.
- Price field's placeholder now reads `"Price (required)"` vs. `"Price (optional)"` depending on the current `status` value — a small, cheap UX signal matching the new conditional requirement.

**`BikeAccessoryCard.tsx`** — added an optional purchase-date line (`accessory.status === "purchased" && accessory.purchaseDate`), formatted via `date-fns`' `format(new Date(...), "d MMM yyyy")` — this repo's already-established date-formatting choice (`FuelLogFormModal.tsx` uses the same import), not a new dependency.

No changes needed to the payload-building logic in `handleSubmit` — `purchaseDate` is never sent, and `status`/`price` were already part of the existing payload.

## Implementation

1. ✅ `types/bike-accessory.types.ts` — `purchaseDate?: string` added to `TBikeAccessory`.
2. ✅ `components/main/shared/SelectPickerField.tsx` — new `disabled?: boolean` prop + `touchableDisabled` style.
3. ✅ `BikeAccessoryFormModal.tsx` — `isStatusLocked` computed + wired to the Status field + hint text; new price-required-on-purchase validation in `handleSubmit`; conditional price placeholder.
4. ✅ `BikeAccessoryCard.tsx` — optional purchase-date display line, using `date-fns`' existing `format` import pattern.

## Dependencies

None new — `date-fns` is already a dependency (used identically in `FuelLogFormModal.tsx`).

## Verify

- [x] `npx tsc --noEmit` — clean, 0 errors.
- [x] `expo lint` — clean, 0 issues.
- [ ] **Not exercised on a real device/simulator or Expo web** — same standing gap as every other spec in this app (see `ai context/progress-tracker.md`'s Known Gaps: "nothing in this app has ever been exercised against a live backend or a real device/simulator/Expo-web target in this environment"). Unlike the sibling `bikelog_client-web-` spec 23, this session did not attempt an Expo-web-based Playwright check — the app's `utils/envConfig.ts` hardcodes the deployed backend URL (not env-var-driven), and reaching a locally-runnable target would have meant temporarily editing app source just to test, then reverting; given the identical business logic was already thoroughly live-verified twice over (directly against the real `bikelog_server` API for spec 25, and end-to-end in an actual browser for the structurally-identical web client's spec 23), this was judged not worth the added complexity. Every changed pattern here (the `disabled` prop shape, the `Toast.show` validation idiom, the `date-fns` `format` call) is a direct, verbatim reuse of an already-proven pattern elsewhere in this exact codebase, not new code shape — reviewed against those originals line-by-line instead.

Genuinely unverified until a real device/simulator pass: whether `SelectPickerField`'s new dimmed/disabled visual (`opacity: 0.5`) reads clearly against this app's dark theme, and whether the hint text's `marginTop: -10` (copied verbatim from the web client's analogous spacing choice, adapted to this component's own style block) looks right in practice rather than just being locally-reasoned-about spacing math.
