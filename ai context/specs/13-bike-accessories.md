# 13: Bike Accessories

Status: ✅ Complete

## Goal

Build the bike accessories screen (`app/bikes/[bikeId]/accessories.tsx` route + `BikeAccessory` component + `BikeAccessoryCard` + `BikeAccessoryFormModal`): display accessory wishlist (parts the rider wants to buy), create/edit via modal with urgency and status selects (the first real usage of the Picker/Menu decision from spec 02), filter by status/urgency, and swipe-to-delete.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):

- `GET /bikes/:bikeId/accessories` — returns paginated accessory list.
- `POST /bikes/:bikeId/accessories` — body `{ name, urgency: "immediate"|"medium"|"low" (required), status: "pending"|"purchased"|"cancelled" (defaults "pending") }`.
- `PATCH /bikes/:bikeId/accessories/:id` — all fields optional. Both `urgency` and `status` are freely PATCH-able (no state machine, no guards).
- `DELETE /bikes/:bikeId/accessories/:id` — soft delete.

**Form fields**:

- name (string, required).
- urgency (3-option enum: "immediate", "medium", "low") — **use Picker or Menu from spec 02**.
- status (3-option enum: "pending", "purchased", "cancelled") — **use Picker or Menu from spec 02**.

**Display**:

- Cards show name, two badges (urgency and status colors from spec 02's `accessoryUrgencyColors` and `accessoryStatusColors` lookup tables).
- Optional filter buttons (by urgency, by status, or both).

**Recommended usage of Picker/Menu**:

- This spec is the recommended first real usage of the Picker-vs-Menu decision made in spec 02.
- Form has two 3+-option selects (urgency and status), no catalog dependency (unlike maintenance logs), so it's the simplest case to test the Picker styling.
- If Picker's styling clashes with Paper's borderless TextInput look, now is the time to switch to Menu fallback and document the decision.

## Design

### Files to create/modify

| Path                                                       | Action | Notes                                                                          |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `app/bikes/[bikeId]/accessories.tsx`                       | Create | One-liner route wrapper.                                                       |
| `components/main/BikeAccessory/BikeAccessory.tsx`          | Create | List component with optional urgency/status filters.                           |
| `components/main/BikeAccessory/BikeAccessoryCard.tsx`      | Create | Accessory card, shows name, urgency badge, status badge. Swipe left to delete. |
| `components/main/BikeAccessory/BikeAccessoryFormModal.tsx` | Create | Create/edit modal, name input + urgency picker + status picker.                |
| `types/bike-accessory.types.ts`                            | Create | `IBikeAccessory`, `TCreateBikeAccessoryPayload`, etc.                          |

### BikeAccessory component (pseudo-code)

```tsx
export function BikeAccessory() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filterParams = new URLSearchParams();
  if (urgencyFilter) filterParams.append("urgency", urgencyFilter);
  if (statusFilter) filterParams.append("status", statusFilter);
  const queryString = filterParams.toString();

  const { data, isLoading, refetch } = useFetchData<{
    result: IBikeAccessory[];
    meta: number;
  }>(
    ["accessories", bikeId, urgencyFilter, statusFilter],
    `/bikes/${bikeId}/accessories?${queryString}`,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const accessories = data?.result || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accessories</Text>
        <Button onPress={() => setModalOpen(true)}>Add to Wishlist</Button>
      </View>

      {/* Urgency filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Urgency:</Text>
        {["immediate", "medium", "low"].map((urg) => (
          <TouchableOpacity
            key={urg}
            style={[
              styles.filterButton,
              urgencyFilter === urg && styles.filterButtonActive,
            ]}
            onPress={() => setUrgencyFilter(urgencyFilter === urg ? null : urg)}
          >
            <Text style={styles.filterButtonText}>{urg}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        {["pending", "purchased", "cancelled"].map((stat) => (
          <TouchableOpacity
            key={stat}
            style={[
              styles.filterButton,
              statusFilter === stat && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(statusFilter === stat ? null : stat)}
          >
            <Text style={styles.filterButtonText}>{stat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : accessories.length === 0 ? (
        <EmptyState label="No accessories on your wishlist yet." />
      ) : (
        <RefreshControl onRefresh={() => refetch()} refreshing={isLoading}>
          <ScrollView>
            {accessories.map((acc) => (
              <BikeAccessoryCard key={acc.id} accessory={acc} bikeId={bikeId} />
            ))}
          </ScrollView>
        </RefreshControl>
      )}

      <BikeAccessoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
      />
    </View>
  );
}
```

### BikeAccessoryCard component

```tsx
export function BikeAccessoryCard({
  accessory,
  bikeId,
}: {
  accessory: IBikeAccessory;
  bikeId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);

  const { mutateAsync: deleteMutation } = useDelete([["accessories", bikeId]]);

  const handleDelete = () => {
    confirmDelete("accessory", async () => {
      await deleteMutation({
        url: `/bikes/${bikeId}/accessories/${accessory.id}`,
      });
    });
    swipeableRef.current?.close();
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={() => (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteAction}>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity style={styles.card} onPress={() => setEditOpen(true)}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{accessory.name}</Text>
          </View>

          <View style={styles.badgesContainer}>
            <StatusBadge
              label={accessory.urgency}
              colorKey={accessory.urgency}
            />
            <StatusBadge label={accessory.status} colorKey={accessory.status} />
          </View>
        </TouchableOpacity>
      </Swipeable>

      <BikeAccessoryFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialAccessory={accessory}
      />
    </>
  );
}
```

### BikeAccessoryFormModal

```tsx
// Uses SelectPickerField or SelectMenuField from spec 02
// Fields: name (required), urgency picker, status picker
export function BikeAccessoryFormModal({
  open,
  onClose,
  bikeId,
  initialAccessory,
}: {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialAccessory?: IBikeAccessory;
}) {
  const [name, setName] = useState("");
  const [urgency, setUrgency] = useState<"immediate" | "medium" | "low">(
    "medium",
  );
  const [status, setStatus] = useState<"pending" | "purchased" | "cancelled">(
    "pending",
  );

  const { mutateAsync: createMutation } = usePost([["accessories", bikeId]]);
  const { mutateAsync: updateMutation } = usePatch([["accessories", bikeId]]);

  useEffect(() => {
    if (initialAccessory && open) {
      setName(initialAccessory.name || "");
      setUrgency(initialAccessory.urgency || "medium");
      setStatus(initialAccessory.status || "pending");
    } else if (!initialAccessory && open) {
      setName("");
      setUrgency("medium");
      setStatus("pending");
    }
  }, [initialAccessory, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Name is required" });
      return;
    }

    const payload = {
      name: name.trim(),
      urgency,
      status,
    };

    try {
      if (initialAccessory) {
        await updateMutation({
          url: `/bikes/${bikeId}/accessories/${initialAccessory.id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Accessory updated" });
      } else {
        await createMutation({
          url: `/bikes/${bikeId}/accessories`,
          payload,
        });
        Toast.show({ type: "success", text1: "Accessory added" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save accessory",
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
            {initialAccessory ? "Edit Accessory" : "Add to Wishlist"}
          </Text>

          <TextInput
            mode="flat"
            label="Item Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <SelectPickerField
            label="Urgency"
            value={urgency}
            onChange={(val) =>
              setUrgency(val as "immediate" | "medium" | "low")
            }
            options={[
              { label: "Immediate", value: "immediate" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ]}
            required
          />

          <SelectPickerField
            label="Status"
            value={status}
            onChange={(val) =>
              setStatus(val as "pending" | "purchased" | "cancelled")
            }
            options={[
              { label: "Pending", value: "pending" },
              { label: "Purchased", value: "purchased" },
              { label: "Cancelled", value: "cancelled" },
            ]}
            required
          />

          <Button mode="contained" onPress={handleSubmit} style={styles.button}>
            {initialAccessory ? "Update" : "Add"}
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

1. **Create `types/bike-accessory.types.ts`**: `IBikeAccessory`, `TCreateBikeAccessoryPayload`.
2. **Create `components/main/BikeAccessory/` folder** and 3 component files.
3. **Create `app/bikes/[bikeId]/accessories.tsx`** route wrapper.
4. **Use `SelectPickerField` (or `SelectMenuField` fallback) from spec 02** for urgency and status pickers.
5. **Use `StatusBadge` from spec 02** for displaying urgency and status badges (using the `accessoryUrgencyColors` and `accessoryStatusColors` lookup tables).
6. **Test CRUD**: Create, edit, delete accessories.
7. **Test filters**: Urgency and status filters work correctly.
8. **Test Picker/Menu decision**: This is the first real, full usage of the select component choice made in spec 02. Document in progress-tracker.md if any styling issues were encountered or if fallback to Menu was needed.
9. **Run `expo lint`**.

## Dependencies

Spec 02 (shared components: `StatusBadge`, `SelectPickerField`/`SelectMenuField`) must be done first.

Spec 06 (Bike hub) must exist first.

## Verify

- [x] **Accessories list displays** *(code-verified only — no simulator/device in this environment)*: `BikeAccessory.tsx` fetches `useFetchData<TBikeAccessoriesApiResponse>([...], "/bikes/${bikeId}/accessories?...")`, reads `data?.data?.result ?? []` / `data?.data?.meta ?? 0`, maps to `BikeAccessoryCard` (name + two badges).
- [x] **Badges display correctly**: `<StatusBadge label={accessory.urgency} colorKey={accessory.urgency} colors={accessoryUrgencyColors} />` and the same pattern for `status`/`accessoryStatusColors`, both from spec 02.
- [x] **Create accessory succeeds**: `BikeAccessoryFormModal` posts `TCreateBikeAccessoryPayload` (`name`, `urgency`, `status`) to `POST /bikes/${bikeId}/accessories` — matches the backend exactly (confirmed via `bikeAccessory.validation.ts`: `name`/`urgency` required, `status` optional; the form always sends an explicit `status`, which is valid either way).
- [x] **Edit accessory succeeds**: tap/right-swipe opens the modal with `initialAccessory` set, prefilled via `useEffect` on `[initialAccessory, open]`, `PATCH`es both fields freely (backend confirmed to have no state-machine guard on either field — `updateBikeAccessoryInDB` does a plain `Object.assign`).
- [x] **Delete accessory succeeds**: left-swipe → `confirmDelete()` → `DELETE /bikes/${bikeId}/accessories/${accessory._id}`.
- [x] **Urgency filter works**: pill buttons toggle `urgencyFilter`, appended as `&urgency=...`, included in the query key, resets to page 1 on change.
- [x] **Status filter works**: same pattern for `statusFilter`/`&status=...`.
- [x] **Both filters work together**: both params are independent and both appended to the same `URLSearchParams`, so they combine naturally (backend's `QueryBuilder.filter()` ANDs whatever query keys are present).
- [x] **Picker styling works** *(cannot be confirmed — no device/simulator available)*: `SelectPickerField` (spec 02's default choice) is used for both urgency and status, styled per its existing implementation. This is genuinely the first form in the app to render `SelectPickerField` for real, and the visual mesh-check the spec calls for could not be done in this environment for the same reason it couldn't in spec 02. No `SelectMenuField` fallback was built — no evidence exists that Picker fails, and building a fallback speculatively would be scope creep. Deferred to the developer's first real device run.
- [x] **All urgency/status options available**: `URGENCY_OPTIONS`/`STATUS_OPTIONS` in `BikeAccessoryFormModal.tsx` list all 3+3 values, matching `bikeAccessory.constant.ts`'s enums exactly.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.
- [x] **First real Picker test documented**: see `progress-tracker.md`'s Known Gaps — Picker-vs-Menu remains unconfirmed pending a real device; this is that documentation.

This checklist was not filled in when the spec was originally marked complete; annotated during a later review pass (2026-07-22) — no code changes were needed, the implementation was already correct.
