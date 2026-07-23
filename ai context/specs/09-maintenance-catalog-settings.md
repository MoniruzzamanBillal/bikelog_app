# 09: Maintenance Catalog (Settings)

Status: ✅ Complete

## Goal

Build the settings screen (`app/(tabs)/settings.tsx` route + `SettingsCatalog` component): display and inline-create maintenance types and engine oil types (shared catalogs, not per-bike). These catalogs are prerequisites for spec 10 (maintenance logs).

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `POST /api/maintenance-types` — body `{ name, defaultIntervalKm?, defaultIntervalDays? }`. Duplicate name → 409.
- `GET /api/maintenance-types` — returns `{ data: { result: [MaintenanceType], meta: number } }` (shared catalog, not bike-scoped).
- `POST /api/engine-oil-types` — body `{ name, suggestedIntervalKm }` (both required). Duplicate → 409.
- `GET /api/engine-oil-types` — returns `{ data: { result: [EngineOilType], meta: number } }` (shared catalog).

**Seeded values** (from `bikelog_server/postman/dummy-data.md`):
- Maintenance types: Engine Oil, Chain Lube, Tire Change, Brake Pads, General Service, Insurance, Registration/Tax, Other.
- Oil types: Mineral (800km), Semi-Synthetic (1000km), Synthetic (1250km).

**UI**:
- Two sections: "Maintenance Types" and "Engine Oil Types".
- Each section: list + inline create form (collapsible or separate card).
- Create form: text input + optional numeric inputs, create button.

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/(tabs)/settings.tsx` | Create | One-liner route wrapper. |
| `components/main/SettingsCatalog/SettingsCatalog.tsx` | Create | Two sections (maintenance types, oil types) with list + inline create. |
| `types/catalog.types.ts` | Create | `IMaintenanceType`, `IEngineOilType`, etc. |

### SettingsCatalog component (pseudo-code)

```tsx
export function SettingsCatalog() {
  const { data: maintTypes, isLoading: maintLoading, refetch: refetchMaint } =
    useFetchData<IMaintenanceType[]>(
      ["maintenance-types"],
      "/maintenance-types"
    );

  const { data: oilTypes, isLoading: oilLoading, refetch: refetchOil } =
    useFetchData<IEngineOilType[]>(
      ["engine-oil-types"],
      "/engine-oil-types"
    );

  const { mutateAsync: createMaintType } = usePost([["maintenance-types"]]);
  const { mutateAsync: createOilType } = usePost([["engine-oil-types"]]);

  const [newMaintName, setNewMaintName] = useState("");
  const [newMaintIntervalKm, setNewMaintIntervalKm] = useState("");
  const [newMaintIntervalDays, setNewMaintIntervalDays] = useState("");

  const [newOilName, setNewOilName] = useState("");
  const [newOilIntervalKm, setNewOilIntervalKm] = useState("");

  const [expandMaint, setExpandMaint] = useState(false);
  const [expandOil, setExpandOil] = useState(false);

  const handleCreateMaint = async () => {
    if (!newMaintName.trim()) {
      Toast.show({ type: "error", text1: "Name is required" });
      return;
    }

    try {
      await createMaintType({
        url: "/maintenance-types",
        payload: {
          name: newMaintName.trim(),
          defaultIntervalKm: newMaintIntervalKm ? parseInt(newMaintIntervalKm) : undefined,
          defaultIntervalDays: newMaintIntervalDays ? parseInt(newMaintIntervalDays) : undefined,
        },
      });
      setNewMaintName("");
      setNewMaintIntervalKm("");
      setNewMaintIntervalDays("");
      Toast.show({ type: "success", text1: "Maintenance type added" });
      refetchMaint();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to create",
      });
    }
  };

  const handleCreateOil = async () => {
    if (!newOilName.trim() || !newOilIntervalKm.trim()) {
      Toast.show({ type: "error", text1: "Name and interval are required" });
      return;
    }

    try {
      await createOilType({
        url: "/engine-oil-types",
        payload: {
          name: newOilName.trim(),
          suggestedIntervalKm: parseInt(newOilIntervalKm),
        },
      });
      setNewOilName("");
      setNewOilIntervalKm("");
      Toast.show({ type: "success", text1: "Oil type added" });
      refetchOil();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to create",
      });
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <Text style={styles.title}>Maintenance Types</Text>

      {maintLoading ? (
        <SectionLoading count={3} />
      ) : (maintTypes || []).length === 0 ? (
        <EmptyState label="No maintenance types yet" />
      ) : (
        maintTypes?.map((type) => (
          <View key={type.id} style={styles.typeCard}>
            <Text style={styles.typeName}>{type.name}</Text>
            {type.defaultIntervalKm && (
              <Text style={styles.typeDetail}>Every {type.defaultIntervalKm} km</Text>
            )}
            {type.defaultIntervalDays && (
              <Text style={styles.typeDetail}>Every {type.defaultIntervalDays} days</Text>
            )}
          </View>
        ))
      )}

      <Collapsible title="Add Maintenance Type" open={expandMaint} onOpen={() => setExpandMaint(!expandMaint)}>
        <View style={styles.formContainer}>
          <TextInput
            mode="flat"
            label="Type Name"
            value={newMaintName}
            onChangeText={setNewMaintName}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Default Interval (km, optional)"
            value={newMaintIntervalKm}
            onChangeText={setNewMaintIntervalKm}
            keyboardType="number-pad"
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Default Interval (days, optional)"
            value={newMaintIntervalDays}
            onChangeText={setNewMaintIntervalDays}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Button mode="contained" onPress={handleCreateMaint} style={styles.button}>
            Add Type
          </Button>
        </View>
      </Collapsible>

      <Text style={[styles.title, { marginTop: 32 }]}>Engine Oil Types</Text>

      {oilLoading ? (
        <SectionLoading count={3} />
      ) : (oilTypes || []).length === 0 ? (
        <EmptyState label="No oil types yet" />
      ) : (
        oilTypes?.map((oil) => (
          <View key={oil.id} style={styles.typeCard}>
            <Text style={styles.typeName}>{oil.name}</Text>
            <Text style={styles.typeDetail}>Every {oil.suggestedIntervalKm} km</Text>
          </View>
        ))
      )}

      <Collapsible title="Add Engine Oil Type" open={expandOil} onOpen={() => setExpandOil(!expandOil)}>
        <View style={styles.formContainer}>
          <TextInput
            mode="flat"
            label="Oil Type Name"
            value={newOilName}
            onChangeText={setNewOilName}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Suggested Interval (km)"
            value={newOilIntervalKm}
            onChangeText={setNewOilIntervalKm}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Button mode="contained" onPress={handleCreateOil} style={styles.button}>
            Add Oil Type
          </Button>
        </View>
      </Collapsible>
    </KeyboardAwareScrollView>
  );
}
```

## Implementation

1. **Create `types/catalog.types.ts`**: `IMaintenanceType`, `IEngineOilType`.
2. **Create `components/main/SettingsCatalog/SettingsCatalog.tsx`** component as above.
3. **Create `app/(tabs)/settings.tsx`** route wrapper.
4. **Test list fetch**: Verify maintenance types and oil types display.
5. **Test create**: Each form should create and update the list immediately.
6. **Run `expo lint`**.

## Dependencies

Spec 01 (foundation) must be done first.

This spec must be done before spec 10 (maintenance logs form needs these catalogs to pick from).

## Verify

- [x] **Maintenance types display** *(code-verified — no simulator/device)*: `SettingsCatalog.tsx` calls `useFetchData<TMaintenanceType[]>(["maintenance-types"], "/maintenance-types")`, reads `data?.data ?? []`, maps to type cards showing name + intervals. `isLoading` → `SectionLoading`, empty → `EmptyState`.
- [x] **Oil types display**: Same pattern for `useFetchData<TEngineOilType[]>(["engine-oil-types"], "/engine-oil-types")`, shows name + suggested interval. Loading/empty states identical pattern.
- [x] **Create maintenance type succeeds**: Inline expandable form posts `TCreateMaintenanceTypePayload` to `POST /maintenance-types`, toasts, refetches, collapses form. Name required, intervals optional.
- [x] **Create oil type succeeds**: Inline expandable form posts `TCreateEngineOilTypePayload` to `POST /engine-oil-types`, toasts, refetches, collapses form. Name + interval both required.
- [x] **Duplicate name shows error**: `catch` block toasts `error?.message || "Failed to create"` — backend returns 409 with message for duplicates (no special 409 check needed since the error message is already descriptive).
- [x] **Optional fields handled correctly**: Maintenance type form allows blank interval fields; they're omitted from payload when empty (`...condition ? {}`).
- [x] **Collapsible sections work**: Two sections (maintenance + oil) each with expand/collapse toggles using `useState<boolean>` + `TouchableOpacity` with chevron icon.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.
