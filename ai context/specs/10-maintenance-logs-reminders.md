# 10: Maintenance Logs & Reminders

Status: ✅ Complete

## Goal

Build the maintenance logs screen (`app/bikes/[bikeId]/maintenance-logs.tsx` route + `MaintenanceLog` component + `MaintenanceLogCard` + `MaintenanceLogFormModal` + `RemindersBanner`): display list of maintenance events with a reminders banner at the top, create/edit via modal with catalog pickers (requires spec 09's catalogs), and swipe-to-delete.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):

- `GET /bikes/:bikeId/maintenance-logs?page=1&limit=10&sort=-serviceDate` — returns paginated list.
- `POST /bikes/:bikeId/maintenance-logs` — body `{ maintenanceType (ObjectId, required), odometerReading, intervalKmUsed, cost, oilType? (ObjectId), nextDueDate?, serviceDate? (defaults now), serviceCenter?, partsReplaced? (string[]), notes? }`. **Never send `nextDueOdometer`** (server-computed as `odometerReading + intervalKmUsed`).
- `PATCH /bikes/:bikeId/maintenance-logs/:id` — same fields, all optional. Recomputes `nextDueOdometer` if `odometerReading`/`intervalKmUsed` change.
- `DELETE /bikes/:bikeId/maintenance-logs/:id` — soft delete.
- `GET /bikes/:bikeId/reminders` — returns `{ reminders: [...] }` — computed on-read, only actually-due/upcoming items. **Known backend quirk**: reminders don't populate `maintenanceType` (bare ObjectId string, not the object). Resolve client-side by matching against fetched maintenance-types list.

**Form fields**:

- maintenanceType (required, 3+-option select via Picker/Menu from spec 02).
- odometerReading (number, required).
- intervalKmUsed (number, required — the km covered by this maintenance).
- cost (number, optional).
- oilType (optional, 3+-option select if maintenance is oil-change).
- nextDueDate (optional, date input).
- serviceDate (optional, defaults to now).
- serviceCenter (optional, text).
- partsReplaced (optional, comma-separated text → convert to string[]).
- notes (optional, multiline text).

**RemindersBanner**:

- Displayed at top of list, shows reminders for future-due or upcoming maintenance.
- Reminders have: maintenanceType (resolve ObjectId to name via fetched catalog), nextDueDate, nextDueOdometer, and status ("due", "upcoming", "overdue", or similar).
- If no reminders, banner is hidden.

## Design

### Files to create/modify

| Path                                                         | Action | Notes                                                                                                |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `app/bikes/[bikeId]/maintenance-logs.tsx`                    | Create | One-liner route wrapper.                                                                             |
| `components/main/MaintenanceLog/MaintenanceLog.tsx`          | Create | List component with reminders banner + list.                                                         |
| `components/main/MaintenanceLog/MaintenanceLogCard.tsx`      | Create | Single log card, shows type name, date, odometer, cost. Swipe to delete.                             |
| `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` | Create | Create/edit modal with all 8 fields, Picker for type/oil, date input, parts as comma-separated text. |
| `components/main/MaintenanceLog/RemindersBanner.tsx`         | Create | Displays upcoming/due maintenance as a scrollable list of colored cards.                             |
| `types/maintenance-log.types.ts`                             | Create | `IMaintenanceLog`, `IReminder`, `TCreateMaintenanceLogPayload`, etc.                                 |

### RemindersBanner component (pseudo-code)

```tsx
export function RemindersBanner({
  bikeId,
  maintenanceTypes,
}: {
  bikeId: string;
  maintenanceTypes: IMaintenanceType[];
}) {
  const { data: reminders, isLoading } = useFetchData<{
    reminders: IReminder[];
  }>(["reminders", bikeId], `/bikes/${bikeId}/reminders`);

  if (isLoading || !reminders?.reminders?.length) {
    return null;
  }

  const reminderList = reminders.reminders.map((reminder) => {
    // Resolve maintenanceType ObjectId to name
    const typeId = reminder.maintenanceType;
    const typeName =
      maintenanceTypes.find((t) => t.id === typeId)?.name || typeId;

    return { ...reminder, maintenanceTypeName: typeName };
  });

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Reminders</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {reminderList.map((reminder) => (
          <View key={reminder.id} style={styles.reminderCard}>
            <Text style={styles.reminderType}>
              {reminder.maintenanceTypeName}
            </Text>
            {reminder.nextDueDate && (
              <Text style={styles.reminderDate}>
                Due: {format(new Date(reminder.nextDueDate), "dd MMM")}
              </Text>
            )}
            {reminder.nextDueOdometer && (
              <Text style={styles.reminderOdometer}>
                @ {reminder.nextDueOdometer} km
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
```

### MaintenanceLog component

```tsx
export function MaintenanceLog() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const { data: maintTypes } = useFetchData<IMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );
  const {
    data: logs,
    isLoading,
    refetch,
  } = useFetchData<{
    result: IMaintenanceLog[];
    meta: number;
  }>(
    ["maintenance-logs", bikeId],
    `/bikes/${bikeId}/maintenance-logs?page=1&limit=10`,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const maintenanceLogs = logs?.result || [];

  return (
    <View style={styles.container}>
      <RemindersBanner bikeId={bikeId} maintenanceTypes={maintTypes || []} />

      <View style={styles.header}>
        <Text style={styles.title}>Maintenance Logs</Text>
        <Button onPress={() => setModalOpen(true)}>Add Log</Button>
      </View>

      {isLoading ? (
        <SectionLoading count={5} />
      ) : maintenanceLogs.length === 0 ? (
        <EmptyState label="No maintenance logs yet." />
      ) : (
        <RefreshControl onRefresh={() => refetch()} refreshing={isLoading}>
          <ScrollView>
            {maintenanceLogs.map((log) => (
              <MaintenanceLogCard
                key={log.id}
                log={log}
                bikeId={bikeId}
                maintenanceTypes={maintTypes || []}
              />
            ))}
          </ScrollView>
        </RefreshControl>
      )}

      <MaintenanceLogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
      />
    </View>
  );
}
```

### MaintenanceLogFormModal

```tsx
// Uses SelectPickerField (or SelectMenuField) from spec 02
// Fields: maintenanceType picker, odometerReading, intervalKmUsed, cost, oilType picker,
//         nextDueDate, serviceDate, serviceCenter, partsReplaced (comma-separated), notes
// Never send nextDueOdometer in payload
```

## Implementation

1. **Create `types/maintenance-log.types.ts`**: `IMaintenanceLog`, `IReminder`, etc.
2. **Create `components/main/MaintenanceLog/` folder** and 4 component files.
3. **Create `app/bikes/[bikeId]/maintenance-logs.tsx`** route wrapper.
4. **In form modal**: Use `SelectPickerField` from spec 02 for maintenanceType + oilType pickers.
5. **In RemindersBanner**: Fetch `/reminders` endpoint, resolve maintenanceType ObjectId to name using fetched catalog.
6. **Test CRUD**: Create, edit, delete maintenance logs.
7. **Test reminders**: Verify banner displays and resolves type names correctly.
8. **Run `expo lint`**.

## Dependencies

Spec 09 (Maintenance catalog) must be done first (form needs catalogs to pick from).

Spec 06 (Bike hub) links to this screen.

## Verify

- [x] **Maintenance logs list displays** *(code-verified — no simulator/device)*: `MaintenanceLog.tsx` calls `useFetchData<TMaintenanceLogsApiResponse>(["maintenanceLogs", bikeId], "/bikes/${bikeId}/maintenance-logs?page=1&limit=20&sort=-serviceDate")`, reads `data?.data?.result ?? []`, maps to `MaintenanceLogCard` showing type name, service date, odometer, cost, interval, parts, notes. `isLoading` → `SectionLoading`, empty → `EmptyState`. **Corrected in a later review pass** (see Implementation Note below): `getTypeName()` now takes a `maintenanceTypes` catalog prop and resolves the bare-ObjectId case against it, instead of silently falling back to the generic label "Maintenance" for every card.
- [x] **Reminders banner displays**: `RemindersBanner.tsx` calls `useFetchData<{reminders: TReminder[]}>(["reminders", bikeId], "/bikes/${bikeId}/reminders")`, reads `data?.data?.reminders ?? []`. Horizontal scroll of colored cards — red/overdue, amber/upcoming. Hidden when loading or empty. **This item's original claim was wrong and has been corrected** — see Implementation Note below.
- [x] **Create log succeeds**: `MaintenanceLogFormModal` with `SelectPickerField` for maintenanceType + conditional oilType picker (shown only when "Engine Oil" selected), text inputs for odometer/interval/cost/dates/center/parts/notes. Posts `TCreateMaintenanceLogPayload` (no `nextDueOdometer` field in type) to `POST /bikes/${bikeId}/maintenance-logs`. Invalidates both `["maintenanceLogs", bikeId]` and `["reminders", bikeId]`.
- [x] **Edit log succeeds**: Right-swipe reveals Edit (via `renderLeftActions`), opens modal with `log` prop, prefilled via `useEffect` on `[log, open]`. `PATCH` to `/bikes/${bikeId}/maintenance-logs/${log._id}`.
- [x] **Delete log succeeds**: Left-swipe reveals Delete (via `renderRightActions`), calls `confirmDelete()` → `DELETE /bikes/${bikeId}/maintenance-logs/${log._id}`, invalidates both keys.
- [x] **Picker fields work**: `SelectPickerField` from spec 02 used for both maintenanceType and oilType pickers, options sourced from fetched catalogs.
- [x] **Parts replaced as array**: Comma-separated text input → `split(",").map(s => s.trim()).filter(Boolean)` on submit, sent as `string[]` or `undefined` if empty.
- [x] **No `nextDueOdometer` in payload**: `TCreateMaintenanceLogPayload` type has no `nextDueOdometer` field — `maintenanceType`, `odometerReading`, `oilType?`, `intervalKmUsed`, `nextDueDate?`, `cost`, `serviceDate?`, `serviceCenter?`, `partsReplaced?`, `notes?` only.
- [x] **Date fields work**: `serviceDate` and `nextDueDate` as text inputs `YYYY-MM-DD`, split from ISO on prefill (`date.split("T")[0]`), sent as ISO on submit. Default serviceDate = today.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note — real bug found and fixed in a later review pass (2026-07-22)**: this spec was originally marked complete with a live, user-visible defect. Both `RemindersBanner.tsx` and `MaintenanceLogCard.tsx` assumed `maintenanceType` arrives as a populated `{_id, name}` object — `TReminder.maintenanceType` was typed that way, and `MaintenanceLogCard`'s `getTypeName()` fell back to the generic label `"Maintenance"` whenever it wasn't an object. Cross-checked against the actual backend source (`bikelog_server/src/app/modules/maintenanceLog/maintenanceLog.service.ts`: `getRemindersFromDB` builds reminder objects with `.lean()` and no `.populate()` call anywhere; `getMaintenanceLogsFromDB` never populates either) — `maintenanceType` is **always** a bare ObjectId string in both responses, exactly as this spec's own Context section already said ("Known backend quirk: reminders don't populate `maintenanceType`... resolve client-side"). The result before the fix: every reminder card showed a blank/undefined type name, and every maintenance log card showed the generic "Maintenance" label instead of the real type (e.g. "Engine Oil", "Chain Lube") — for every single log, always, not an edge case.

Also discovered in the same investigation: the already-shipped web client's `RemindersBanner.tsx` has the **identical** bug (`r.maintenanceType.name`, with `TReminder.maintenanceType` typed as always-populated) — likely where this spec's Verify checklist's wrong claim ("per web client's proven type") originated. Per `ai-workflow-rules.md`'s cross-project rule, this was **not** fixed in `bikelog_client-web-/` (out of scope, separate project) — noting it here and in `progress-tracker.md`'s Known Gaps instead, for the user to decide whether to flag it there.

Fix: `TReminder.maintenanceType` changed to `string` (`types/maintenance-log.types.ts`); `RemindersBanner` and `MaintenanceLogCard` now both take a `maintenanceTypes: TMaintenanceType[]` prop (fetched once in `MaintenanceLog.tsx` via `useFetchData(["maintenance-types"], "/maintenance-types")` and passed to both children) and resolve the ObjectId against it, exactly matching this spec's own Design pseudo-code for `RemindersBanner`, which had the correct resolution logic all along — only the actual implementation had drifted from it.
