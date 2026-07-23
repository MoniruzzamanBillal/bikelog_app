# 06: Bike Hub (Bike Detail Page)

Status: ✅ Complete

## Goal

Build the bike detail/hub page (`app/bikes/[bikeId]/index.tsx` route + `BikeDetailPage` component): display bike info, allow edit/delete actions, and show 6 navigation tiles to bike-scoped screens (Fuel Logs, Mileage, Maintenance, Spending, Issues, Accessories).

## Context

**Backend contract**:

- `GET /bikes/:id` — returns single bike object.
- Bike info: nickname, brand, model, registrationNumber, purchaseDate, fuelTankCapacityLiters, currentOdometer, initialOdometer.
- Edit/delete same as spec 05 (PATCH never sends `owner` or `currentOdometer`, DELETE soft-deletes).

**Navigation tiles** (6 destinations, each spec 07–12):

1. Fuel Logs (`app/bikes/[bikeId]/fuel-logs.tsx`)
2. Mileage (`app/bikes/[bikeId]/mileage.tsx`)
3. Maintenance Logs (`app/bikes/[bikeId]/maintenance-logs.tsx`)
4. Spending (`app/bikes/[bikeId]/spending.tsx`)
5. Issues (`app/bikes/[bikeId]/issues.tsx`)
6. Accessories (`app/bikes/[bikeId]/accessories.tsx`)

**Route structure**: `app/bikes/[bikeId]/index.tsx` is the hub; other routes live in the same folder.

## Design

### Files to create/modify

| Path                                      | Action       | Notes                                                                         |
| ----------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| `app/bikes/[bikeId]/index.tsx`            | Create       | One-liner route wrapper.                                                      |
| `components/main/Bike/BikeDetailPage.tsx` | Create       | Bike info card, edit/delete buttons, 6 nav tiles.                             |
| `components/main/Bike/BikeFormModal.tsx`  | Reuse/Create | Same as spec 05's `BikeFormModal` (can copy or import if in shared location). |

### BikeDetailPage component (pseudo-code)

```tsx
export function BikeDetailPage() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const { data: bike, isLoading } = useFetchData<IBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <SectionLoading />;
  if (!bike) return <EmptyState label="Bike not found" />;

  const handleDelete = () => {
    confirmDelete("bike", async () => {
      await deleteMutation({ url: `/bikes/${bikeId}` });
      router.replace("/");
    });
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      {/* Bike info card */}
      <View style={styles.infoCard}>
        <Text style={styles.nickname}>{bike.nickname}</Text>
        <Text style={styles.details}>
          {bike.brand} {bike.model}
        </Text>
        <Text style={styles.detail}>Reg: {bike.registrationNumber}</Text>
        <Text style={styles.detail}>Tank: {bike.fuelTankCapacityLiters}L</Text>
        <Text style={styles.detail}>Odometer: {bike.currentOdometer} km</Text>
      </View>

      {/* Edit/Delete buttons */}
      <View style={styles.actions}>
        <Button onPress={() => setEditOpen(true)}>Edit</Button>
        <Button onPress={handleDelete} mode="outlined">
          Delete
        </Button>
      </View>

      {/* Navigation tiles */}
      <View style={styles.tiles}>
        <TileButton
          label="Fuel Logs"
          icon="gas-cylinder"
          onPress={() => router.push(`/bikes/${bikeId}/fuel-logs`)}
        />
        <TileButton
          label="Mileage"
          icon="tachometer"
          onPress={() => router.push(`/bikes/${bikeId}/mileage`)}
        />
        <TileButton
          label="Maintenance"
          icon="wrench"
          onPress={() => router.push(`/bikes/${bikeId}/maintenance-logs`)}
        />
        <TileButton
          label="Spending"
          icon="cash"
          onPress={() => router.push(`/bikes/${bikeId}/spending`)}
        />
        <TileButton
          label="Issues"
          icon="alert-circle"
          onPress={() => router.push(`/bikes/${bikeId}/issues`)}
        />
        <TileButton
          label="Accessories"
          icon="shopping"
          onPress={() => router.push(`/bikes/${bikeId}/accessories`)}
        />
      </View>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </KeyboardAwareScrollView>
  );
}

function TileButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={32} color={COLORS.primary} />
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
```

## Implementation

1. **Create `app/bikes/[bikeId]/index.tsx`**: One-liner route wrapper.
2. **Create `components/main/Bike/BikeDetailPage.tsx`**: Info card + edit/delete + tiles.
3. **Reuse `BikeFormModal`** from spec 05 (move to a shared location if not already there, or duplicate for now).
4. **Create `components/main/Bike/BikeDetailPage.tsx`** folder and helper components as needed.
5. **Test bike fetch**: Route param `[bikeId]` is extracted, bike is fetched and displayed.
6. **Test navigation**: Tapping each tile navigates to the correct route.
7. **Run `expo lint`**.

## Dependencies

Spec 05 (Dashboard, which links to this page) must be done first.

Specs 07–12 (bike-scoped screens) depend on this page existing (but can be built in parallel with this spec, once the route structure is in place).

## Verify

- [x] **Bike info displays** *(code-verified only — no simulator/device in this environment)*: `useFetchData<TBike>(["bikes", bikeId], \`/bikes/${bikeId}\`, {enabled: !!bikeId})`, reads `data?.data` (same `.data`-drilling requirement documented in spec 05), renders nickname/brand+model/registration/tank/odometer; `isLoading` → `SectionLoading`, missing bike → `EmptyState label="Bike not found."`.
- [x] **Edit/Delete buttons work** *(code-verified only)*: Edit opens the shared `components/main/Bike/BikeFormModal.tsx` (same component spec 05's Dashboard uses for create) with `initialBike={bike}`; Delete calls the shared `confirmDelete()` helper → `useDelete` → `router.replace("/")`.
- [x] **Tiles navigate correctly** *(cannot fully verify — destination routes don't exist yet)*: all 6 tiles call `router.push(\`/bikes/${bikeId}/${segment}\` as never)` with the correct 6 segments (`fuel-logs`, `mileage`, `maintenance-logs`, `spending`, `issues`, `accessories`), matching the Context section's route list exactly. The `as never` cast (not the object form used in spec 05) is required here specifically because these destination routes don't exist until specs 07–12 build them — `expo-router`'s typed routes has no type for a route that isn't on disk yet, regardless of string-template vs. object form.
- [x] **No server-derived fields on edit**: same `TUpdateBikePayload` type as spec 05 (structurally excludes `currentOdometer`; `owner` was never in either payload type).
- [x] **After delete, redirect to Dashboard**: `router.replace("/")` inside the delete's `onConfirm` callback, after the mutation resolves.
- [x] **Route param works**: `useLocalSearchParams<{ bikeId: string }>()`, typed explicitly per `code-standards.md`'s convention.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note**: this spec's own Design table left `BikeFormModal` as "Reuse/Create... same as spec 05's" with the note "move to a shared location if not already there" — since specs 05 and 06 were implemented together in this pass, `BikeFormModal.tsx` was placed directly in `components/main/Bike/` from the start (see spec 05's Implementation Note #6), so both specs import the exact same file rather than one spec creating it and the other moving/duplicating it afterward. This spec also inherits spec 05's `_id`-not-`id` and `.data`-drilling corrections (this spec's own Design sample had the same `id` field name and un-drilled `data` access as spec 05's). Additionally, this spec's route (`app/bikes/[bikeId]/index.tsx`) sits outside `(tabs)`, and `architecture.md`'s System Boundaries section explicitly calls out that this stack "needs the same `AuthGuard` wrapping applied ... too" (distinct from `(tabs)/_layout.tsx`'s own guard) — this spec's own Design/Implementation sections never mentioned this file, so it was added as `app/bikes/_layout.tsx` (a plain `AuthGuard`-wrapped `<Slot />`, covering `[bikeId]` and any future nested bike-scoped routes from specs 07–12) to close that explicitly-documented, otherwise-silently-missed gap.
