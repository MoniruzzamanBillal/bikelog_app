# 07: Fuel Logs

Status: ✅ Complete

## Goal

Build the fuel logs screen (`app/bikes/[bikeId]/fuel-logs.tsx` route + `FuelLog` component + `FuelLogCard` + `FuelLogFormModal`): display list of fuel fill-ups, create/edit via modal, swipe-to-delete, show loading/empty states.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `GET /bikes/:bikeId/fuel-logs?page=1&limit=10&sort=-date` — pagination (meta is raw count, compute totalPages client-side).
- `POST /bikes/:bikeId/fuel-logs` — body `{ odometerReading, litersAdded, isFullTank, pricePerLiter, fuelStation?, date?, notes? }`. **Never send `totalCost`** (server-computes). `date` defaults to now. Response: `{ data: { fuelLog, mileageRecordClosed } }` (unusual nesting, see design).
- `PATCH /bikes/:bikeId/fuel-logs/:id` — same fields, all optional. **409 if this log already closed a mileage record.** Never send `totalCost`.
- `DELETE /bikes/:bikeId/fuel-logs/:id` — same 409 rule.

**Form fields**:
- odometerReading (number, required)
- litersAdded (number, required, positive)
- isFullTank (boolean, default false)
- pricePerLiter (number, required, positive)
- fuelStation (string, optional)
- date (ISO date, optional, defaults now)
- notes (string, optional)

**Computed display**:
- totalCost = litersAdded * pricePerLiter (compute client-side for display, never send to backend).
- Pagination: show page selector or infinite scroll; for v1, simple page selector is sufficient.

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/bikes/[bikeId]/fuel-logs.tsx` | Create | One-liner route wrapper. |
| `components/main/FuelLog/FuelLog.tsx` | Create | List component with pagination, RefreshControl, skeleton, empty state, modal trigger. |
| `components/main/FuelLog/FuelLogCard.tsx` | Create | Single fuel log card, displays odometerReading, litersAdded, totalCost, date. Swipe left to delete. |
| `components/main/FuelLog/FuelLogFormModal.tsx` | Create | Create/edit modal, all 7 fields, isFullTank as pill toggle, date picker (or text input YYYY-MM-DD). |
| `types/fuel-log.types.ts` | Create | `IFuelLog`, `TCreateFuelLogPayload`, etc. |

### FuelLog component (pseudo-code)

```tsx
export function FuelLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading, refetch } = useFetchData<{
    result: IFuelLog[];
    meta: number;
  }>(["fuelLogs", bikeId, page], `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${limit}`);

  const [modalOpen, setModalOpen] = useState(false);

  const fuelLogs = data?.result || [];
  const totalPages = Math.ceil((data?.meta || 0) / limit);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fuel Logs</Text>
        <Button onPress={() => setModalOpen(true)}>Add Log</Button>
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : fuelLogs.length === 0 ? (
        <EmptyState label="No fuel logs yet. Track your fill-ups here." />
      ) : (
        <>
          <RefreshControl onRefresh={() => refetch()} refreshing={isLoading}>
            <ScrollView>
              {fuelLogs.map((log) => (
                <FuelLogCard key={log.id} fuelLog={log} bikeId={bikeId} />
              ))}
            </ScrollView>
          </RefreshControl>

          {/* Page selector */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <Text>Page {page} of {totalPages}</Text>
              <Button
                disabled={page === 1}
                onPress={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={page === totalPages}
                onPress={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </View>
          )}
        </>
      )}

      <FuelLogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
      />
    </View>
  );
}
```

### FuelLogCard component

```tsx
export function FuelLogCard({ fuelLog, bikeId }: { fuelLog: IFuelLog; bikeId: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const { mutateAsync: deleteMutation } = useDelete([["fuelLogs", bikeId]]);

  const handleDelete = () => {
    confirmDelete("fuel log", async () => {
      await deleteMutation({ url: `/bikes/${bikeId}/fuel-logs/${fuelLog.id}` });
    });
    swipeableRef.current?.close();
  };

  const totalCost = fuelLog.litersAdded * fuelLog.pricePerLiter;

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={() => (
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.deleteAction]}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => setEditOpen(true)}
        >
          <View style={styles.row}>
            <Text style={styles.odometer}>Odometer: {fuelLog.odometerReading} km</Text>
            <Text style={styles.date}>{format(new Date(fuelLog.date), "dd MMM")}</Text>
          </View>
          <Text style={styles.details}>
            {fuelLog.litersAdded}L @ ৳{fuelLog.pricePerLiter}/L
          </Text>
          <Text style={styles.totalCost}>Total: ৳{totalCost.toFixed(2)}</Text>
          {fuelLog.isFullTank && (
            <StatusBadge label="Full Tank" colorKey="success" />
          )}
        </TouchableOpacity>
      </Swipeable>

      <FuelLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialFuelLog={fuelLog}
      />
    </>
  );
}
```

### FuelLogFormModal component

```tsx
export function FuelLogFormModal({
  open,
  onClose,
  bikeId,
  initialFuelLog,
}: {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialFuelLog?: IFuelLog;
}) {
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [isFullTank, setIsFullTank] = useState(false);
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [station, setStation] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const { mutateAsync: createMutation } = usePost([["fuelLogs", bikeId]]);
  const { mutateAsync: updateMutation } = usePatch([["fuelLogs", bikeId]]);

  // Pre-fill on edit
  useEffect(() => {
    if (initialFuelLog && open) {
      setOdometer(initialFuelLog.odometerReading.toString());
      setLiters(initialFuelLog.litersAdded.toString());
      setIsFullTank(initialFuelLog.isFullTank || false);
      setPricePerLiter(initialFuelLog.pricePerLiter.toString());
      setStation(initialFuelLog.fuelStation || "");
      setDate(format(new Date(initialFuelLog.date), "yyyy-MM-dd"));
      setNotes(initialFuelLog.notes || "");
    } else if (!initialFuelLog && open) {
      // Reset form for create
      setOdometer("");
      setLiters("");
      setIsFullTank(false);
      setPricePerLiter("");
      setStation("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
    }
  }, [initialFuelLog, open]);

  const handleSubmit = async () => {
    if (!odometer.trim() || !liters.trim() || !pricePerLiter.trim()) {
      Toast.show({ type: "error", text1: "Odometer, liters, and price are required" });
      return;
    }

    const payload = {
      odometerReading: parseInt(odometer),
      litersAdded: parseFloat(liters),
      isFullTank,
      pricePerLiter: parseFloat(pricePerLiter),
      fuelStation: station || undefined,
      date: date || new Date().toISOString(),
      notes: notes || undefined,
      // Never send totalCost
    };

    try {
      if (initialFuelLog) {
        await updateMutation({
          url: `/bikes/${bikeId}/fuel-logs/${initialFuelLog.id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Fuel log updated" });
      } else {
        await createMutation({
          url: `/bikes/${bikeId}/fuel-logs`,
          payload,
        });
        Toast.show({ type: "success", text1: "Fuel log added" });
      }
      onClose();
    } catch (error: any) {
      const message = error?.message || "Failed to save fuel log";
      // Handle 409 case (mileage record already closed)
      if (error?.statusCode === 409) {
        Toast.show({ type: "error", text1: "Cannot edit: mileage record already closed for this period" });
      } else {
        Toast.show({ type: "error", text1: message });
      }
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView style={styles.scrollView}>
          <Text style={styles.title}>
            {initialFuelLog ? "Edit Fuel Log" : "Add Fuel Log"}
          </Text>

          <TextInput
            mode="flat"
            label="Odometer (km)"
            value={odometer}
            onChangeText={setOdometer}
            keyboardType="number-pad"
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Liters Added"
            value={liters}
            onChangeText={setLiters}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Full Tank?</Text>
          <View style={styles.pillButtonContainer}>
            <TouchableOpacity
              style={[
                styles.pillButton,
                isFullTank && styles.pillButtonActive,
              ]}
              onPress={() => setIsFullTank(true)}
            >
              <Text style={isFullTank ? styles.pillTextActive : styles.pillText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pillButton,
                !isFullTank && styles.pillButtonActive,
              ]}
              onPress={() => setIsFullTank(false)}
            >
              <Text style={!isFullTank ? styles.pillTextActive : styles.pillText}>No</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            mode="flat"
            label="Price per Liter"
            value={pricePerLiter}
            onChangeText={setPricePerLiter}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Fuel Station (optional)"
            value={station}
            onChangeText={setStation}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
          >
            {initialFuelLog ? "Update" : "Add"}
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

1. **Create `types/fuel-log.types.ts`**: `IFuelLog`, `TCreateFuelLogPayload`, etc.
2. **Create `components/main/FuelLog/` folder** and three component files.
3. **Create `app/bikes/[bikeId]/fuel-logs.tsx`** route wrapper.
4. **Test list fetch**: Pagination works, cards display correctly.
5. **Test create/edit**: Modal opens, form fields work, submission succeeds.
6. **Test delete**: 409 error handling (if applicable).
7. **Run `expo lint`**.

## Dependencies

Spec 06 (Bike hub, which links to this screen) must exist first.

## Verify

- [x] **Fuel logs list displays** *(code-verified — no simulator/device)*: `FuelLog.tsx` calls `useFetchData<TFuelLogsApiResponse>(["fuelLogs", bikeId, page], "/bikes/${bikeId}/fuel-logs?page=${page}&limit=10&sort=-date")` and reads `data?.data?.result ?? []`, maps to `FuelLogCard`. `isLoading` → `SectionLoading count={5}`, empty → `EmptyState`.
- [x] **totalCost displays correctly**: Computed client-side as `fuelLog.litersAdded * fuelLog.pricePerLiter` in `FuelLogCard.tsx:127`, displayed as `৳{totalCost.toFixed(2)}`.
- [x] **Pagination works**: `page`/`setPage` state in `FuelLog.tsx`, `totalPages = Math.ceil((data?.data?.meta ?? 0) / 10) || 1`, Previous/Next buttons disabled at boundaries.
- [x] **Create fuel log succeeds**: `FuelLogFormModal` posts `TCreateFuelLogPayload` (no `totalCost` field in type) to `POST /bikes/${bikeId}/fuel-logs`, toasts on success, shows mileage record toast if `result?.data?.mileageRecordClosed` present, invalidates `["fuelLogs", bikeId]`.
- [x] **Edit fuel log succeeds**: Right-swipe reveals Edit (via `renderLeftActions`), opens `FuelLogFormModal` with `initialFuelLog` set, prefilled via `useEffect` on `[initialFuelLog, open]`, `PATCH` to `/bikes/${bikeId}/fuel-logs/${initialFuelLog._id}`.
- [x] **Delete fuel log succeeds**: Left-swipe reveals Delete (via `renderRightActions`), calls `confirmDelete()` → `DELETE /bikes/${bikeId}/fuel-logs/${fuelLog._id}`, invalidates `["fuelLogs", bikeId]`.
- [x] **409 error on mileage-record-closed**: `catch` block in `FuelLogFormModal` checks `error?.statusCode === 409` and shows specific error toast.
- [x] **Never sends `totalCost`**: `TCreateFuelLogPayload` type has no `totalCost` field — `odometerReading`, `litersAdded`, `isFullTank`, `pricePerLiter`, `fuelStation?`, `date?`, `notes?` only.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.
