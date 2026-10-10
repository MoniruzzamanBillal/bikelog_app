import {
  EmptyState,
  FormField,
  Panel,
  PrimaryButton,
  RuleFade,
  ScreenHeader,
  SectionLoading,
  SwitchField,
  confirm,
} from "@/components/main/shared";
import { useUserContext } from "@/context/user.context";
import { useDelete, useFetchData, usePatch, usePost } from "@/hooks/useApi";
import {
  TEngineOilType,
  TMaintenanceType,
  TUpdateEngineOilTypePayload,
  TUpdateMaintenanceTypePayload,
} from "@/types/catalog.types";
import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  TextInput as NativeTextInput,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { OdometerPanel } from "./OdometerPanel";
import { PanelIcon } from "./PanelIcon";

/** Compact inline-edit input used inside a catalog table row. */
function CellInput(props: React.ComponentProps<typeof NativeTextInput>) {
  return (
    <NativeTextInput
      placeholderTextColor={COLORS.placeholder}
      selectionColor={COLORS.accent}
      cursorColor={COLORS.accent}
      {...props}
      style={[cellStyles.input, props.style]}
    />
  );
}

function RowIcon({
  name,
  color,
  onPress,
  disabled,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[cellStyles.icon, disabled && cellStyles.iconDisabled]}
      hitSlop={6}
    >
      <MaterialCommunityIcons name={name} size={16} color={color} />
    </TouchableOpacity>
  );
}

const cellStyles = StyleSheet.create({
  input: {
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    fontSize: 13,
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: {
    opacity: 0.45,
  },
});

const dash = (n?: number | null) => (n ? n.toLocaleString() : "—");

export function SettingsCatalog() {
  const { user, logoutFunction } = useUserContext();
  const {
    data: maintData,
    isLoading: maintLoading,
    refetch: refetchMaint,
  } = useFetchData<TMaintenanceType[]>(
    ["maintenance-types"],
    "/maintenance-types",
  );
  const {
    data: oilData,
    isLoading: oilLoading,
    refetch: refetchOil,
  } = useFetchData<TEngineOilType[]>(["engine-oil-types"], "/engine-oil-types");

  const createMaintType = usePost([["maintenance-types"]]);
  const createOilType = usePost([["engine-oil-types"]]);
  const updateMaintType = usePatch([["maintenance-types"]]);
  const updateOilType = usePatch([["engine-oil-types"]]);
  const deleteMaintType = useDelete([["maintenance-types"]]);
  const deleteOilType = useDelete([["engine-oil-types"]]);

  const maintTypes = maintData?.data ?? [];
  const oilTypes = oilData?.data ?? [];

  const [newMaintName, setNewMaintName] = useState("");
  const [newMaintIntervalKm, setNewMaintIntervalKm] = useState("");
  const [newMaintIntervalDays, setNewMaintIntervalDays] = useState("");
  const [newMaintRequiresOil, setNewMaintRequiresOil] = useState(false);
  const [expandMaint, setExpandMaint] = useState(false);

  const [newOilName, setNewOilName] = useState("");
  const [newOilIntervalKm, setNewOilIntervalKm] = useState("");
  const [expandOil, setExpandOil] = useState(false);

  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [editMaintName, setEditMaintName] = useState("");
  const [editMaintIntervalKm, setEditMaintIntervalKm] = useState("");
  const [editMaintIntervalDays, setEditMaintIntervalDays] = useState("");
  const [editMaintRequiresOil, setEditMaintRequiresOil] = useState(false);

  const [editingOilId, setEditingOilId] = useState<string | null>(null);
  const [editOilName, setEditOilName] = useState("");
  const [editOilIntervalKm, setEditOilIntervalKm] = useState("");

  const handleCreateMaint = async () => {
    if (!newMaintName.trim()) {
      Toast.show({ type: "error", text1: "Name is required", position: "top" });
      return;
    }
    try {
      await createMaintType.mutateAsync({
        url: "/maintenance-types",
        payload: {
          name: newMaintName.trim(),
          ...(newMaintIntervalKm.trim()
            ? { defaultIntervalKm: parseInt(newMaintIntervalKm, 10) }
            : {}),
          ...(newMaintIntervalDays.trim()
            ? { defaultIntervalDays: parseInt(newMaintIntervalDays, 10) }
            : {}),
          requiresOilType: newMaintRequiresOil,
        },
      });
      setNewMaintName("");
      setNewMaintIntervalKm("");
      setNewMaintIntervalDays("");
      setNewMaintRequiresOil(false);
      setExpandMaint(false);
      Toast.show({
        type: "success",
        text1: "Maintenance type added",
        position: "top",
      });
      refetchMaint();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to create",
        position: "top",
      });
    }
  };

  const startEditMaint = (type: TMaintenanceType) => {
    setEditingMaintId(type?._id);
    setEditMaintName(type?.name);
    setEditMaintIntervalKm(
      type?.defaultIntervalKm ? String(type?.defaultIntervalKm) : "",
    );
    setEditMaintIntervalDays(
      type?.defaultIntervalDays ? String(type?.defaultIntervalDays) : "",
    );
    setEditMaintRequiresOil(!!type?.requiresOilType);
    setExpandMaint(false);
  };

  const cancelEditMaint = () => {
    setEditingMaintId(null);
  };

  const handleSaveMaintEdit = async () => {
    if (!editMaintName.trim()) {
      Toast.show({ type: "error", text1: "Name is required", position: "top" });
      return;
    }
    try {
      const payload: TUpdateMaintenanceTypePayload = {
        name: editMaintName.trim(),
        defaultIntervalKm: editMaintIntervalKm.trim()
          ? parseInt(editMaintIntervalKm, 10)
          : null,
        defaultIntervalDays: editMaintIntervalDays.trim()
          ? parseInt(editMaintIntervalDays, 10)
          : null,
        requiresOilType: editMaintRequiresOil,
      };
      await updateMaintType.mutateAsync({
        url: `/maintenance-types/${editingMaintId}`,
        payload,
      });
      setEditingMaintId(null);
      Toast.show({
        type: "success",
        text1: "Maintenance type updated",
        position: "top",
      });
      refetchMaint();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update",
        position: "top",
      });
    }
  };

  const handleDeleteMaint = (type: TMaintenanceType) => {
    confirm({
      title: "Delete maintenance type?",
      message: `"${type?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`,
      confirmLabel: "Delete",
      tone: "danger",
      icon: "trash-can-outline",
      onConfirm: async () => {
        try {
          await deleteMaintType.mutateAsync({
            url: `/maintenance-types/${type?._id}`,
          });
          Toast.show({
            type: "success",
            text1: "Maintenance type deleted",
            position: "top",
          });
          refetchMaint();
        } catch {
          // ! Deliberately empty. The axios interceptor already surfaced the backend's
          // ! message — a 409 "still in use" refusal shows as an amber warning toast
          // ! (spec 45 §3). A Toast.show here would double it, which is exactly the
          // ! pre-existing bug the other catch blocks in this file still have.
        }
      },
    });
  };

  const handleDeleteOil = (oil: TEngineOilType) => {
    confirm({
      title: "Delete oil type?",
      message: `"${oil?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`,
      confirmLabel: "Delete",
      tone: "danger",
      icon: "trash-can-outline",
      onConfirm: async () => {
        try {
          await deleteOilType.mutateAsync({
            url: `/engine-oil-types/${oil?._id}`,
          });
          Toast.show({
            type: "success",
            text1: "Oil type deleted",
            position: "top",
          });
          refetchOil();
        } catch {
          // ! See handleDeleteMaint — interceptor owns the error toast.
        }
      },
    });
  };

  const startEditOil = (oil: TEngineOilType) => {
    setEditingOilId(oil?._id);
    setEditOilName(oil?.name);
    setEditOilIntervalKm(String(oil?.suggestedIntervalKm));
    setExpandOil(false);
  };

  const cancelEditOil = () => {
    setEditingOilId(null);
  };

  const handleSaveOilEdit = async () => {
    if (!editOilName.trim() || !editOilIntervalKm.trim()) {
      Toast.show({
        type: "error",
        text1: "Name and interval are required",
        position: "top",
      });
      return;
    }
    try {
      const payload: TUpdateEngineOilTypePayload = {
        name: editOilName.trim(),
        suggestedIntervalKm: parseInt(editOilIntervalKm, 10),
      };
      await updateOilType.mutateAsync({
        url: `/engine-oil-types/${editingOilId}`,
        payload,
      });
      setEditingOilId(null);
      Toast.show({
        type: "success",
        text1: "Oil type updated",
        position: "top",
      });
      refetchOil();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update",
        position: "top",
      });
    }
  };

  const handleCreateOil = async () => {
    if (!newOilName.trim() || !newOilIntervalKm.trim()) {
      Toast.show({
        type: "error",
        text1: "Name and interval are required",
        position: "top",
      });
      return;
    }
    try {
      await createOilType.mutateAsync({
        url: "/engine-oil-types",
        payload: {
          name: newOilName.trim(),
          suggestedIntervalKm: parseInt(newOilIntervalKm, 10),
        },
      });
      setNewOilName("");
      setNewOilIntervalKm("");
      setExpandOil(false);
      Toast.show({ type: "success", text1: "Oil type added", position: "top" });
      refetchOil();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to create",
        position: "top",
      });
    }
  };

  const handleLogout = () => {
    confirm({
      title: "Log out?",
      message: "You'll need to sign in again to reach your bikes.",
      confirmLabel: "Log out",
      tone: "danger",
      icon: "logout",
      onConfirm: async () => {
        await logoutFunction();
        router.replace("/auth");
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Odometer ---------- */}
        <OdometerPanel />

        {/* ---------- Maintenance types ---------- */}
        <Panel style={styles.panel}>
          <View style={styles.panelHeader}>
            <PanelIcon name="wrench-outline" color={COLORS.primary} />
            <View style={styles.panelTitleCol}>
              <Text style={styles.panelTitle}>Maintenance types</Text>
              <Text style={styles.panelSub}>
                Your catalog · used by your maintenance logs and reminders
              </Text>
            </View>
            <PrimaryButton
              onPress={() => setExpandMaint(!expandMaint)}
              icon={expandMaint ? "close" : "plus"}
              variant={expandMaint ? "secondary" : "primary"}
              compact
            >
              {expandMaint ? "Close" : "Add"}
            </PrimaryButton>
          </View>

          {expandMaint && (
            <View style={styles.addForm}>
              <FormField
                label="Type name"
                required
                placeholder="Insurance"
                value={newMaintName}
                onChangeText={setNewMaintName}
                editable={!createMaintType.isPending}
              />
              <View style={styles.row2}>
                <FormField
                  label="Interval (km)"
                  placeholder="optional"
                  value={newMaintIntervalKm}
                  onChangeText={setNewMaintIntervalKm}
                  keyboardType="number-pad"
                  editable={!createMaintType.isPending}
                  style={styles.rowField}
                />
                <FormField
                  label="Interval (days)"
                  placeholder="optional"
                  value={newMaintIntervalDays}
                  onChangeText={setNewMaintIntervalDays}
                  keyboardType="number-pad"
                  editable={!createMaintType.isPending}
                  style={styles.rowField}
                />
              </View>
              <SwitchField
                label="Needs an engine oil type"
                description="Shows the oil-type picker when you log this service"
                value={newMaintRequiresOil}
                onChange={setNewMaintRequiresOil}
                disabled={createMaintType.isPending}
              />
              <PrimaryButton
                onPress={handleCreateMaint}
                loading={createMaintType.isPending}
              >
                Add type
              </PrimaryButton>
            </View>
          )}

          {maintLoading ? (
            <SectionLoading count={2} />
          ) : maintTypes?.length === 0 ? (
            <EmptyState
              icon="wrench-outline"
              title="No maintenance types yet"
              message="Add one to start logging services against it."
              style={styles.bareState}
            />
          ) : (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colName]}>NAME</Text>
                <Text style={[styles.th, styles.colNum]}>KM</Text>
                <Text style={[styles.th, styles.colNum]}>DAYS</Text>
                <View style={styles.colAction} />
              </View>
              <RuleFade />

              {maintTypes.map((type) => (
                <View key={type._id}>
                  {editingMaintId === type?._id ? (
                    <View style={styles.editBlock}>
                      <CellInput
                        value={editMaintName}
                        onChangeText={setEditMaintName}
                        editable={!updateMaintType.isPending}
                        placeholder="Type name"
                        style={styles.editNameInput}
                      />
                      <SwitchField
                        label="Needs an engine oil type"
                        value={editMaintRequiresOil}
                        onChange={setEditMaintRequiresOil}
                        disabled={updateMaintType.isPending}
                      />
                      <View style={styles.editControls}>
                        <CellInput
                          value={editMaintIntervalKm}
                          onChangeText={setEditMaintIntervalKm}
                          keyboardType="number-pad"
                          placeholder="km"
                          editable={!updateMaintType.isPending}
                          style={styles.editNumInput}
                        />
                        <CellInput
                          value={editMaintIntervalDays}
                          onChangeText={setEditMaintIntervalDays}
                          keyboardType="number-pad"
                          placeholder="days"
                          editable={!updateMaintType.isPending}
                          style={styles.editNumInput}
                        />
                        <View style={styles.editActions}>
                          <RowIcon
                            name="check"
                            color={COLORS.success}
                            onPress={handleSaveMaintEdit}
                            disabled={updateMaintType.isPending}
                          />
                          <RowIcon
                            name="close"
                            color={COLORS.danger}
                            onPress={cancelEditMaint}
                            disabled={updateMaintType.isPending}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tr}>
                      <Text
                        style={[styles.td, styles.colName]}
                        numberOfLines={1}
                      >
                        {type?.name}
                      </Text>
                      <Text style={[styles.tdNum, styles.colNum]}>
                        {dash(type?.defaultIntervalKm)}
                      </Text>
                      <Text style={[styles.tdNum, styles.colNum]}>
                        {dash(type?.defaultIntervalDays)}
                      </Text>
                      <View style={styles.colAction}>
                        <RowIcon
                          name="pencil-outline"
                          color={COLORS.primary}
                          onPress={() => startEditMaint(type)}
                        />
                        <RowIcon
                          name="trash-can-outline"
                          color={COLORS.danger}
                          onPress={() => handleDeleteMaint(type)}
                          disabled={deleteMaintType.isPending}
                        />
                      </View>
                    </View>
                  )}
                  <RuleFade />
                </View>
              ))}
            </View>
          )}
        </Panel>

        {/* ---------- Engine oil types ---------- */}
        <Panel style={styles.panel}>
          <View style={styles.panelHeader}>
            <PanelIcon name="oil" color={COLORS.warning} />
            <View style={styles.panelTitleCol}>
              <Text style={styles.panelTitle}>Engine oil types</Text>
              <Text style={styles.panelSub}>
                Suggested interval pre-fills the oil-change service form
              </Text>
            </View>
            <PrimaryButton
              onPress={() => setExpandOil(!expandOil)}
              icon={expandOil ? "close" : "plus"}
              variant={expandOil ? "secondary" : "primary"}
              compact
            >
              {expandOil ? "Close" : "Add"}
            </PrimaryButton>
          </View>

          {expandOil && (
            <View style={styles.addForm}>
              <FormField
                label="Oil type name"
                required
                placeholder="Synthetic"
                value={newOilName}
                onChangeText={setNewOilName}
                editable={!createOilType.isPending}
              />
              <FormField
                label="Suggested interval (km)"
                required
                placeholder="1250"
                value={newOilIntervalKm}
                onChangeText={setNewOilIntervalKm}
                keyboardType="number-pad"
                editable={!createOilType.isPending}
              />
              <PrimaryButton
                onPress={handleCreateOil}
                loading={createOilType.isPending}
              >
                Add oil type
              </PrimaryButton>
            </View>
          )}

          {oilLoading ? (
            <SectionLoading count={2} />
          ) : oilTypes?.length === 0 ? (
            <EmptyState
              icon="oil"
              title="No oil types yet"
              message="Add the oils you use so service logs can suggest an interval."
              style={styles.bareState}
            />
          ) : (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colName]}>NAME</Text>
                <Text style={[styles.th, styles.colWide]}>SUGGESTED KM</Text>
                <View style={styles.colAction} />
              </View>
              <RuleFade />

              {oilTypes.map((oil) => (
                <View key={oil._id}>
                  {editingOilId === oil?._id ? (
                    <View style={styles.editBlock}>
                      <CellInput
                        value={editOilName}
                        onChangeText={setEditOilName}
                        editable={!updateOilType.isPending}
                        placeholder="Oil type name"
                        style={styles.editNameInput}
                      />
                      <View style={styles.editControls}>
                        <CellInput
                          value={editOilIntervalKm}
                          onChangeText={setEditOilIntervalKm}
                          keyboardType="number-pad"
                          placeholder="km"
                          editable={!updateOilType.isPending}
                          style={styles.editNumInput}
                        />
                        <View style={styles.editActions}>
                          <RowIcon
                            name="check"
                            color={COLORS.success}
                            onPress={handleSaveOilEdit}
                            disabled={updateOilType.isPending}
                          />
                          <RowIcon
                            name="close"
                            color={COLORS.danger}
                            onPress={cancelEditOil}
                            disabled={updateOilType.isPending}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.tr}>
                      <Text
                        style={[styles.td, styles.colName]}
                        numberOfLines={1}
                      >
                        {oil?.name}
                      </Text>
                      <Text style={[styles.tdNum, styles.colWide]}>
                        {dash(oil?.suggestedIntervalKm)}
                      </Text>
                      <View style={styles.colAction}>
                        <RowIcon
                          name="pencil-outline"
                          color={COLORS.primary}
                          onPress={() => startEditOil(oil)}
                        />
                        <RowIcon
                          name="trash-can-outline"
                          color={COLORS.danger}
                          onPress={() => handleDeleteOil(oil)}
                          disabled={deleteOilType.isPending}
                        />
                      </View>
                    </View>
                  )}
                  <RuleFade />
                </View>
              ))}
            </View>
          )}
        </Panel>

        {/* ---------- Account ---------- */}
        <Panel style={styles.panel}>
          <View style={styles.panelHeader}>
            <PanelIcon name="account-circle-outline" color={COLORS.primary} />
            <View style={styles.panelTitleCol}>
              <Text style={styles.panelTitle}>Account</Text>
              {user?.email ? (
                <Text style={styles.accountEmail}>{user?.email}</Text>
              ) : null}
            </View>
          </View>
          <PrimaryButton
            onPress={handleLogout}
            variant="destructive"
            icon="logout"
          >
            Log out
          </PrimaryButton>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  panel: {
    padding: 16,
    gap: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  panelSub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  addForm: {
    paddingTop: 4,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  bareState: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  tableHead: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  th: {
    fontSize: 11,
    letterSpacing: 0.9,
    color: COLORS.textLight,
  },
  tr: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  td: {
    fontSize: 13.5,
    color: COLORS.text,
  },
  tdNum: {
    fontSize: 13,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  colName: {
    flex: 1,
    minWidth: 0,
  },
  colNum: {
    width: 56,
    textAlign: "right",
  },
  colWide: {
    width: 110,
    textAlign: "right",
  },
  colAction: {
    // ! 64, not 32: holds the pencil plus spec 45's trash icon. RowIcon is 32pt square, so
    // ! two sit side by side; the flex NAME column absorbs the difference. Read-only row
    // ! only — spec 43's stacked editor has its own action container.
    width: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  // ! The inline editor deliberately does NOT reuse the table's columns. Sharing them
  // ! left the name input with flex:1 of whatever survived two 56pt interval fields and
  // ! 64pt of action icons — about 96pt on a 360pt-wide screen — so any real type name
  // ! ("Engine Oil Change") overflowed and scrolled horizontally inside the field, which
  // ! is unreadable and uneditable. Stacking gives the name the panel's full inner width
  // ! and drops the interval fields to a second line, where flex:1 each is far roomier
  // ! than the fixed 56/90pt they had. Columns stop lining up with the header while a row
  // ! is being edited; the placeholders ("km"/"days") carry that meaning instead.
  editBlock: {
    paddingVertical: 8,
    gap: 8,
  },
  editNameInput: {
    width: "100%",
  },
  editControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editNumInput: {
    flex: 1,
    textAlign: "right",
  },
  editActions: {
    flexDirection: "row",
  },
  accountEmail: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});
