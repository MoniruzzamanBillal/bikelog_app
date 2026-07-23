# 15: Bike Accessory Optional Price

Status: ✅ Complete

## Goal

Let a `bikeAccessory` wishlist entry optionally record its price, mirroring a backend change already made (not yet deployed) to the `bikeAccessory` module. Add the field to the create/edit form and show it on the accessory card when set. Small additive-field spec — no new screens, no removal of anything existing.

## Context

**Backend contract** (verified directly against `../bikelog_server` source, since the backend hasn't been deployed yet — this is the one reference that can't be stale; also documented in the backend repo's own `context/specs/14-bike-accessory-price.md`):

- `bikeAccessory.interface.ts:9` — `TBikeAccessory.price?: number`. Optional, no default.
- `bikeAccessory.model.ts` — `price: { type: Number }`. Optional, no default, not `select: false`, so it's always present in list/get responses whenever set.
- `bikeAccessory.validation.ts:14,23` — both `createBikeAccessorySchema` and `updateBikeAccessorySchema` have `price: z.number().positive().optional()`. Optional, but **`0` and negative values are rejected with a 400** when a value is supplied — same convention as every other cost-like field in this backend (`fuelLog.validation.ts`'s `pricePerLiter`/`totalCost`/`litersAdded`).
- No service/controller/route changes on the backend — `createBikeAccessoryIntoDB`'s `{...payload, bike: bikeId}` spread and `updateBikeAccessoryInDB`'s `Object.assign(accessory, payload)` both pass `price` through automatically, with no field allowlist to update.
- Explicitly out of scope on the backend side (and out of scope here too): wiring accessory `price` into `spending-summary`'s category totals. Not implemented on either side.

**Client currently has zero knowledge of `price`** — confirmed by reading `types/bike-accessory.types.ts`, `components/main/BikeAccessory/BikeAccessoryFormModal.tsx`, and `BikeAccessoryCard.tsx` in full. This spec adds it consistently with how every other optional numeric field is already handled in this app (`FuelLogFormModal.tsx`'s `pricePerLiter`, `MaintenanceLogFormModal.tsx`'s `cost`): string in state, regex-validated on change, parsed only at submit, included in the payload only when non-empty.

## Design

### Files to modify

| Path                                                       | Change                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `types/bike-accessory.types.ts`                            | Add `price?: number` to `TBikeAccessory`, `TCreateBikeAccessoryPayload`, and `TUpdateBikeAccessoryPayload`. |
| `components/main/BikeAccessory/BikeAccessoryFormModal.tsx` | Add a `price` string field to the form: state, `TextInput`, validation, prefill, payload.                   |
| `components/main/BikeAccessory/BikeAccessoryCard.tsx`      | Display `price` when present, using the app's existing `৳{amount.toFixed(2)}` currency convention.          |

### `BikeAccessoryFormModal.tsx` changes

Add a local `DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/` (same pattern already declared per-file elsewhere, e.g. `BikeFormModal.tsx`, `FuelLogFormModal.tsx` — no shared regex utility exists in this codebase, so this follows the established per-file convention rather than introducing one).

```tsx
const [price, setPrice] = useState("");

// in the open/prefill useEffect:
setPrice(initialAccessory?.price?.toString() ?? "");
// (and "" in the new-entry / !initialAccessory branch, same as every other field)

// in handleSubmit, before building the payload:
if (
  price.trim() &&
  (!DECIMAL_REGEX.test(price.trim()) || parseFloat(price) <= 0)
) {
  Toast.show({
    type: "error",
    text1: "Enter a valid price greater than 0",
    position: "top",
  });
  return;
}

const payload: TCreateBikeAccessoryPayload = {
  name: name.trim(),
  urgency,
  status,
  ...(price.trim() ? { price: parseFloat(price) } : {}),
};
```

JSX — add after the Status `SelectPickerField`, before the submit button:

```tsx
<View style={styles.field}>
  <TextInput
    placeholder="Price (optional)"
    value={price}
    onChangeText={setPrice}
    keyboardType="decimal-pad"
    editable={!isPending}
    textColor={COLORS.text}
    style={styles.input}
  />
</View>
```

Validating `> 0` client-side (not just the regex) matters because the backend's `.positive()` rejects `0` — without this check, a user typing `0` would pass the regex, get sent to the server, and hit a 400 the form doesn't otherwise anticipate. The payload construction (`...(price.trim() ? {...} : {})`) guarantees `price` is never sent as `0` or `""` — omitted entirely when blank, exactly like `fuelStation`/`notes` elsewhere in the app.

### `BikeAccessoryCard.tsx` changes

Add directly under the name, above the existing `badgesRow`:

```tsx
<Text style={styles.name}>{accessory.name}</Text>;
{
  accessory.price !== undefined && (
    <Text style={styles.price}>৳{accessory.price.toFixed(2)}</Text>
  );
}
<View style={styles.badgesRow}>...</View>;
```

New style (matches `FuelLogCard.tsx`'s `totalCost` style):

```ts
price: {
  fontSize: 14,
  fontWeight: "600",
  color: COLORS.text,
  marginBottom: 8,
},
```

Conditional on `!== undefined` since accessories created before this change won't have the field at all.

## Implementation

1. ✅ Updated `types/bike-accessory.types.ts`: added `price?: number` to all three types.
2. ✅ Updated `BikeAccessoryFormModal.tsx`: added `DECIMAL_REGEX`, `price` state, prefill, validation (`> 0` check mirroring the backend's `.positive()`), payload spread (omits `price` entirely when blank), and the new `TextInput` field placed after the Status picker.
3. ✅ Updated `BikeAccessoryCard.tsx`: conditional price display (`accessory.price !== undefined`) + new `price` style, placed under the name above the badges row.
4. ✅ Ran `expo lint` and `npx tsc --noEmit` — both pass clean.

## Dependencies

Spec 13 (bike accessories module must already exist — it does). Backend spec (the sibling repo's own `context/specs/14-bike-accessory-price.md`) must be deployed before this is usable end-to-end against a live server — until then, `price` will 400 if sent, since the currently-deployed backend doesn't have the field yet. **Do not implement/ship this spec until the user confirms the backend has actually been deployed with the `price` field live** — the code can be written and lint/type-verified ahead of time, but should not be considered "done" for real use until the contract it depends on actually exists in production.

## Verify

- [x] `price?: number` added to `TBikeAccessory`, `TCreateBikeAccessoryPayload`, `TUpdateBikeAccessoryPayload` (`types/bike-accessory.types.ts`).
- [x] Form shows a "Price (optional)" field after Status, prefilled from `initialAccessory.price?.toString() ?? ""` on edit, reset to `""` on create — matches every other field's prefill/reset pattern in this form's `useEffect`.
- [x] Submitting with price blank omits `price` from the payload entirely (`...(price.trim() ? { price: parseFloat(price) } : {})` — never `0`, never `""`).
- [x] Submitting with a non-numeric or `0`/negative price shows a client-side error ("Enter a valid price greater than 0") and returns before submitting — mirrors the backend's `.positive()` rejection, catches it before a round-trip.
- [x] Submitting with a valid positive price includes `price: <number>` in the payload (parsed via `parseFloat`).
- [x] Card shows `৳{price.toFixed(2)}` when `price` is set (`components/main/BikeAccessory/BikeAccessoryCard.tsx`), and renders nothing extra when it's `undefined` — old accessories unaffected, confirmed by the `!== undefined` guard.
- [x] `expo lint` and `npx tsc --noEmit` both pass clean *(code-verified only — no simulator/device available in this environment to visually confirm field placement/spacing, per this project's standing caveat)*.
- [x] **Not implemented against a live backend** — the currently-deployed `bikelog_server` doesn't have this field yet; this was implemented against the backend's source code only, per the user's explicit go-ahead to write the code ahead of deployment (matches this spec's own Dependencies note that code can be written/verified ahead of time). **The user still needs to confirm the backend has actually been deployed with `price` live before this is exercised against production** — until then, submitting a price will 400 against whatever backend is actually live.
