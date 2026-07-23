# 05: Dashboard (Bike List)

Status: ✅ Complete

## Goal

Build the dashboard (`app/(tabs)/index.tsx` route + `Dashboard` component + `BikeCard` + `BikeFormModal`): display a list of bikes owned by the logged-in user (`GET /bikes`), allow inline create-bike modal (`POST /bikes`), allow swipe-to-edit/delete actions on each bike card, show loading skeletons while fetching, and show empty state when no bikes exist.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):

- `GET /bikes` — no params, returns `{ data: { result: [Bike], meta: number }, ... }` where `meta` is total count.
- Bike fields (from postman): `{ id, owner (userId), nickname, brand, model, registrationNumber, purchaseDate, fuelTankCapacityLiters, currentOdometer, initialOdometer, isDeleted, createdAt, updatedAt }`.
- `POST /bikes` — body `{ nickname, brand, model, registrationNumber, purchaseDate, fuelTankCapacityLiters, currentOdometer? }`. All required except `currentOdometer` (defaults to 0). Never send `owner` (from JWT). Response includes full bike object.
- `PATCH /bikes/:id` — body same as POST (all optional). Never send `owner` or `currentOdometer` on edit (server strips these). Used by the edit modal.
- `DELETE /bikes/:id` — soft delete (sets `isDeleted: true`).

**UI components**:

- `Dashboard.tsx` — list wrapper, pulls bikes via `useFetchData`, shows RefreshControl, skeleton, empty state, or card list.
- `BikeCard.tsx` — single bike card, displays nickname/brand/model, swipe left (delete, red) and right (edit, green).
- `BikeFormModal.tsx` — create/edit modal (Paper Modal+Portal), pre-filled via `useEffect` on `initialBike` prop (for edit), plain `useState` form fields.

**Styling**:

- Use `StyleSheet.create()`, colors from `COLORS`.
- Card: `borderRadius: 6`, padding 16, `backgroundColor: COLORS.card`, shadow (iOS + Android).
- Empty state: centered text, 40px vertical padding.
- List: scrollable, pull-to-refresh via `RefreshControl`.
- Skeleton: card-shaped (same height/width as real card), multiple lines of `borderRadius: 4` bars, gray background.

## Design

### Files to create/modify

| Path                                          | Action | Notes                                                                                       |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `app/(tabs)/_layout.tsx`                      | Create | Tabs layout, wraps children in AuthGuard, defines tab bar with Dashboard + Settings routes. |
| `app/(tabs)/index.tsx`                        | Create | One-liner, renders `Dashboard`.                                                             |
| `app/(tabs)/settings.tsx`                     | Create | One-liner, renders `SettingsCatalog` (spec 09).                                             |
| `components/main/Dashboard/Dashboard.tsx`     | Create | Main list component, pulls bikes, renders BikeCard list or empty state.                     |
| `components/main/Dashboard/BikeCard.tsx`      | Create | Single bike card, swipe actions.                                                            |
| `components/main/Dashboard/BikeFormModal.tsx` | Create | Create/edit modal for bikes.                                                                |
| `types/bike.types.ts`                         | Create | `IBike`, `TCreateBikePayload`, `TBikeFormData`.                                             |

### Dashboard component

```tsx
// Pseudo-code structure (implement per PLAN.md §4)
export function Dashboard() {
  const { data, isLoading, refetch } = useFetchData<IBike[]>(
    ["bikes"],
    "/bikes",
  );
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Bikes</Text>
      <Button onPress={() => setModalOpen(true)}>Add Bike</Button>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : data?.length === 0 ? (
        <EmptyState label="No bikes yet. Add one to get started." />
      ) : (
        <RefreshControl onRefresh={refetch} refreshing={isLoading}>
          <ScrollView>
            {data?.map((bike) => (
              <BikeCard key={bike.id} bike={bike} />
            ))}
          </ScrollView>
        </RefreshControl>
      )}

      <BikeFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}
```

### BikeCard component

```tsx
// Card with swipe actions for edit (right, green) and delete (left, red)
export function BikeCard({ bike }: { bike: IBike }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation({ url: `/bikes/${bike.id}` });
    });
    swipeableRef.current?.close();
  };

  const handleEdit = () => {
    setEditOpen(true);
    swipeableRef.current?.close();
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={(progress, dragX) => (
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.deleteAction, { width: dragX }]}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
        renderRightActions={(progress, dragX) => (
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.editAction, { width: dragX }]}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          onPress={() => router.push(`/bikes/${bike.id}`)}
          style={styles.card}
        >
          <Text style={styles.nickname}>{bike.nickname}</Text>
          <Text style={styles.details}>
            {bike.brand} {bike.model}
          </Text>
          <Text style={styles.reg}>Reg: {bike.registrationNumber}</Text>
        </TouchableOpacity>
      </Swipeable>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </>
  );
}
```

### BikeFormModal component

```tsx
// Paper Modal with KeyboardAwareScrollView, plain useState form
export function BikeFormModal({
  open,
  onClose,
  initialBike,
}: {
  open: boolean;
  onClose: () => void;
  initialBike?: IBike;
}) {
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [fuelTankCapacity, setFuelTankCapacity] = useState("");
  const [currentOdometer, setCurrentOdometer] = useState("");

  const { mutateAsync: createMutation } = usePost(
    initialBike ? [] : [["bikes"]],
  );
  const { mutateAsync: updateMutation } = usePatch(
    initialBike ? [["bikes"]] : [],
  );

  // Pre-fill on edit
  useEffect(() => {
    if (initialBike && open) {
      setNickname(initialBike.nickname || "");
      setBrand(initialBike.brand || "");
      setModel(initialBike.model || "");
      setRegistrationNumber(initialBike.registrationNumber || "");
      setPurchaseDate(format(new Date(initialBike.purchaseDate), "yyyy-MM-dd"));
      setFuelTankCapacity(initialBike.fuelTankCapacityLiters?.toString() || "");
      setCurrentOdometer(initialBike.currentOdometer?.toString() || "");
    } else if (!initialBike && open) {
      // Reset form for create
      setNickname("");
      setBrand("");
      setModel("");
      setRegistrationNumber("");
      setPurchaseDate("");
      setFuelTankCapacity("");
      setCurrentOdometer("");
    }
  }, [initialBike, open]);

  const handleSubmit = async () => {
    if (
      !nickname.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !registrationNumber.trim() ||
      !purchaseDate
    ) {
      Toast.show({ type: "error", text1: "All fields are required" });
      return;
    }

    const payload = {
      nickname: nickname.trim(),
      brand: brand.trim(),
      model: model.trim(),
      registrationNumber: registrationNumber.trim(),
      purchaseDate,
      fuelTankCapacityLiters: parseFloat(fuelTankCapacity),
      // currentOdometer: only on create (spec requirement: never send on edit)
      ...(initialBike
        ? {}
        : { currentOdometer: parseFloat(currentOdometer) || 0 }),
    };

    try {
      if (initialBike) {
        await updateMutation({
          url: `/bikes/${initialBike.id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Bike updated successfully" });
      } else {
        await createMutation({
          url: "/bikes",
          payload,
        });
        Toast.show({ type: "success", text1: "Bike added successfully" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save bike",
      });
    }
  };

  return (
    <Portal>
      <Modal
        visible={open}
        onDismiss={onClose}
        contentContainerStyle={styles.modal}
      >
        <KeyboardAwareScrollView style={styles.scrollView}>
          <Text style={styles.title}>
            {initialBike ? "Edit Bike" : "Add Bike"}
          </Text>

          <TextInput
            mode="flat"
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Brand"
            value={brand}
            onChangeText={setBrand}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Model"
            value={model}
            onChangeText={setModel}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Registration Number"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Purchase Date (YYYY-MM-DD)"
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Fuel Tank Capacity (Liters)"
            value={fuelTankCapacity}
            onChangeText={setFuelTankCapacity}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          {!initialBike && (
            <TextInput
              mode="flat"
              label="Current Odometer (km)"
              value={currentOdometer}
              onChangeText={setCurrentOdometer}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          )}

          <Button mode="contained" onPress={handleSubmit} style={styles.button}>
            {initialBike ? "Update" : "Add"}
          </Button>

          <Button onPress={onClose} style={styles.cancelButton}>
            Cancel
          </Button>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}
```

## Implementation

1. **Create `types/bike.types.ts`**: Export `IBike`, `TCreateBikePayload`.
2. **Create `components/main/Dashboard/Dashboard.tsx`**: List component with RefreshControl, skeleton, empty state.
3. **Create `components/main/Dashboard/BikeCard.tsx`**: Card with swipe actions.
4. **Create `components/main/Dashboard/BikeFormModal.tsx`**: Modal for create/edit.
5. **Create `app/(tabs)/_layout.tsx`**: Tabs layout with AuthGuard wrapper, Dashboard + Settings tabs.
6. **Create `app/(tabs)/index.tsx`**: Route wrapper.
7. **Create `app/(tabs)/settings.tsx`**: Placeholder (or full SettingsCatalog if spec 09 is done in parallel).
8. **Update `app/_layout.tsx`** (from spec 01): Ensure root layout doesn't break; it should render the app-level providers (UserProvider, QueryClientProvider, ToastProvider, etc.) and then outlets.
9. **Test bike list**: Query should return bikes; cards should display correctly.
10. **Test create/edit modal**: Fields should be clearable/editable, form submission should work.
11. **Test swipe actions**: Swipe left/right should reveal delete/edit buttons.
12. **Run `expo lint`**: No errors.

## Dependencies

Specs 01–04 (setup + auth) must be done first. Spec 05 is the first domain screen and entry point once logged in.

Spec 06 (Bike hub) depends on the bike list existing (tapping a bike navigates to its hub).

## Verify

- [x] **List displays bikes** *(code-verified only — no simulator/device in this environment)*: `Dashboard.tsx` calls `useFetchData<TBike[]>(["bikes"], "/bikes")` and reads `data?.data ?? []` (see Implementation Note below on why `.data` drilling is required), maps to `BikeCard`.
- [x] **Empty state shows**: `bikes.length === 0` renders `<EmptyState label="No bikes yet. Add one to get started." />`.
- [x] **Skeleton shows while loading**: `isLoading` renders `<SectionLoading count={3} />`.
- [x] **Pull-to-refresh works** *(code-verified only)*: `ScrollView`'s `refreshControl` prop (not a wrapper component — see Implementation Note) is bound to a local `refreshing` state + `refetch()`.
- [x] **Create modal opens/closes**: "Add Bike" button sets `modalOpen`; `BikeFormModal`'s `onDismiss`/Cancel button call `onClose`.
- [x] **Create bike succeeds** *(code-verified; not exercised against a live backend)*: posts `TCreateBikePayload` to `/bikes`, includes `currentOdometer` only if provided, toasts, closes, invalidates `["bikes"]`.
- [x] **Edit modal opens/closes**: right-swipe (see Implementation Note on left/right mapping) reveals Edit, opens `BikeFormModal` with `initialBike` set, prefilled via the `useEffect`-on-`[initialBike, open]` pattern.
- [x] **Edit bike succeeds**: posts `TUpdateBikePayload` (which — by its `Omit<TCreateBikePayload, "currentOdometer">` type — structurally cannot include `currentOdometer`; `owner` was never part of either payload type) to `PATCH /bikes/:id`, invalidates both `["bikes"]` and `["bikes", id]` (the latter for spec 06's detail-page query).
- [x] **Delete bike succeeds** *(code-verified only)*: left-swipe reveals Delete, calls the shared `confirmDelete()` helper (spec 02) → `Alert.alert` → `useDelete` mutation → invalidates `["bikes"]`.
- [x] **Tapping card navigates to bike hub**: uses `expo-router`'s typed object-form `router.push({ pathname: "/bikes/[bikeId]", params: { bikeId: bike._id } })` — see Implementation Note on why this form was used instead of a template-literal string.
- [x] **No server-derived fields in payload**: confirmed by type structure, not just runtime discipline — `TCreateBikePayload`/`TUpdateBikePayload` (`types/bike.types.ts`) have no `owner` field at all, and `TUpdateBikePayload` omits `currentOdometer` at the type level.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean (see Implementation Note on a stale generated-types file that had to be cleared first).

**Implementation Note — several corrections made during implementation, per `ai-workflow-rules.md`'s Documentation Sync rule**:
1. **`GET /bikes`'s response shape was wrong in this spec's Context section.** It claimed `{ data: { result: [Bike], meta: number } }`. Checked against the actual backend source (`bikelog_server/src/app/modules/bike/bike.service.ts`'s `getBikesFromDB` returns `bikeModel.find(...)` directly — a plain array, no `result`/`meta` wrapper) and the already-shipped web client's own `Dashboard.tsx` (`const bikes = data?.data ?? [];`). There is no pagination on this endpoint at all. Implemented as `data?.data ?? []`.
2. **Bike's id field is `_id`, not `id`.** This spec used `id` throughout its Design section. Confirmed via the web client's already-verified `bike.types.ts` (`_id: string`) and the backend's raw Mongoose model (no `toJSON` transform adding an `id` alias). Used `_id` everywhere.
3. **The Dashboard sample's `RefreshControl` usage was structurally invalid RN** — it wrapped `<ScrollView>` as a JSX child of `<RefreshControl>...</RefreshControl>`, but `RefreshControl` isn't a container component; it must be passed via `ScrollView`'s `refreshControl` prop. Fixed.
4. **Swipe-action direction was backwards relative to `ui-context.md`'s already-established convention.** This spec's sample used `renderLeftActions` for Delete and `renderRightActions` for Edit; `ui-context.md` documents "left-swipe reveals delete (red), right-swipe reveals edit (green)" — and in `react-native-gesture-handler`, swiping a row *leftward* reveals the *right*-side action panel (`renderRightActions`), not the left one. Implemented `renderRightActions` = Delete, `renderLeftActions` = Edit, matching the documented convention. `ui-context.md`'s own cited reference file for the "only one row open at a time" pattern, `HomePage.tsx`, no longer exists (deleted as expense-tracker domain code in spec 01) — reconstructed the pattern from `react-native-gesture-handler`'s public `onSwipeableWillOpen` callback + a shared `openSwipeableRef` passed from `Dashboard` to each `BikeCard`, the standard documented approach for this exact use case.
5. **Used the non-deprecated `Swipeable`.** The plain `import { Swipeable } from "react-native-gesture-handler"` this spec's sample implicitly assumed is the class-based, `Animated.Value`-driven component, which the library's own type defs mark `@deprecated` in favor of the Reanimated version — and separately, that sample's `style={{ width: dragX }}` on a plain (non-`Animated`) `TouchableOpacity` wouldn't actually animate regardless. Used `react-native-gesture-handler/ReanimatedSwipeable` (this project already depends on `react-native-reanimated`/`react-native-worklets`) with fixed-width action buttons instead of a drag-width-tracking animation — simpler, and avoids introducing an animation pattern used nowhere else in the app.
6. **`BikeFormModal` was placed in `components/main/Bike/`, not `components/main/Dashboard/`** as this spec's file table said — done this way from the start (rather than build-then-move) since spec 06 (built together with this spec) reuses the same modal for editing from the bike hub, and `components/main/<Domain>/` is meant to be one folder per backend module (`code-standards.md`) — "Bike" is the module, "Dashboard" isn't.
7. **`router.push` to `/bikes/:id` needed `expo-router`'s typed object form** (`{ pathname: "/bikes/[bikeId]", params: { bikeId } }`), not a template-literal string — `experiments.typedRoutes: true` is on in `app.json`. Also found and cleared a **stale generated route-types file** (`.expo/types/router.d.ts`, gitignored, regenerates automatically on `expo start`) that still listed pre-spec-01 expense-tracker routes (`/weeklyTransactions`, `/modal`, etc.) and had no knowledge of any route added since — it predates this session's work entirely and was never regenerated because no dev server has run. Removing it lets `expo-router` fall back to its permissive base `Href` type, which correctly accepts the app's actual current routes; it will regenerate accurately the next time `expo start` runs.
8. **The Settings tab is a real placeholder**, not a full `SettingsCatalog` — that's spec 09's explicit job and out of scope here, per this spec's own Implementation step 7 ("Placeholder ... if spec 09 is done in parallel").
9. **The Settings-tab-vs-header-icon question, open since spec 02, is resolved** by this spec's own explicit Design table (`app/(tabs)/_layout.tsx`: "tab bar with Dashboard + Settings routes") — implemented as a 2-tab bar, closing that previously-open question.
