import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import {
  EmptyState,
  FormField,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
} from "@/components/main/shared";
import { useFetchData, usePost } from "@/hooks/useApi";
import { useUserContext } from "@/context/user.context";
import { COLORS } from "@/utils/colors";
import {
  TMaintenanceType,
  TEngineOilType,
} from "@/types/catalog.types";

export function SettingsCatalog() {
  const { user, logoutFunction } = useUserContext();
  const { data: maintData, isLoading: maintLoading, refetch: refetchMaint } =
    useFetchData<TMaintenanceType[]>(["maintenance-types"], "/maintenance-types");
  const { data: oilData, isLoading: oilLoading, refetch: refetchOil } =
    useFetchData<TEngineOilType[]>(["engine-oil-types"], "/engine-oil-types");

  const createMaintType = usePost([["maintenance-types"]]);
  const createOilType = usePost([["engine-oil-types"]]);

  const maintTypes = maintData?.data ?? [];
  const oilTypes = oilData?.data ?? [];

  const [newMaintName, setNewMaintName] = useState("");
  const [newMaintIntervalKm, setNewMaintIntervalKm] = useState("");
  const [newMaintIntervalDays, setNewMaintIntervalDays] = useState("");
  const [expandMaint, setExpandMaint] = useState(false);

  const [newOilName, setNewOilName] = useState("");
  const [newOilIntervalKm, setNewOilIntervalKm] = useState("");
  const [expandOil, setExpandOil] = useState(false);

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
        },
      });
      setNewMaintName("");
      setNewMaintIntervalKm("");
      setNewMaintIntervalDays("");
      setExpandMaint(false);
      Toast.show({ type: "success", text1: "Maintenance type added", position: "top" });
      refetchMaint();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to create",
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
    Alert.alert("Log Out?", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logoutFunction();
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeading}>Maintenance Types</Text>
        {maintLoading ? (
          <SectionLoading count={3} />
        ) : maintTypes.length === 0 ? (
          <EmptyState label="No maintenance types yet." />
        ) : (
          <View style={styles.listCard}>
            {maintTypes.map((type, i) => (
              <View
                key={type._id}
                style={[styles.row, i === maintTypes.length - 1 && styles.rowLast]}
              >
                <Text style={styles.typeName}>{type.name}</Text>
                <Text style={styles.typeDetail}>
                  {type.defaultIntervalKm
                    ? `Every ${type.defaultIntervalKm.toLocaleString()} km`
                    : type.defaultIntervalDays
                      ? `Every ${type.defaultIntervalDays} days`
                      : "No default interval"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setExpandMaint(!expandMaint)}
        >
          <MaterialCommunityIcons
            name={expandMaint ? "chevron-up" : "plus"}
            size={16}
            color={COLORS.accent}
          />
          <Text style={styles.expandToggleText}>
            {expandMaint ? "Collapse" : "Add Type"}
          </Text>
        </TouchableOpacity>

        {expandMaint && (
          <View style={styles.formCard}>
            <FormField
              label="Type Name"
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
            <PrimaryButton
              onPress={handleCreateMaint}
              loading={createMaintType.isPending}
            >
              Add Type
            </PrimaryButton>
          </View>
        )}

        <Text style={[styles.sectionHeading, styles.sectionSpacing]}>
          Engine Oil Types
        </Text>
        {oilLoading ? (
          <SectionLoading count={3} />
        ) : oilTypes.length === 0 ? (
          <EmptyState label="No oil types yet." />
        ) : (
          <View style={styles.listCard}>
            {oilTypes.map((oil, i) => (
              <View
                key={oil._id}
                style={[styles.row, i === oilTypes.length - 1 && styles.rowLast]}
              >
                <Text style={styles.typeName}>{oil.name}</Text>
                <Text style={styles.typeDetail}>
                  Change every {oil.suggestedIntervalKm.toLocaleString()} km
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setExpandOil(!expandOil)}
        >
          <MaterialCommunityIcons
            name={expandOil ? "chevron-up" : "plus"}
            size={16}
            color={COLORS.accent}
          />
          <Text style={styles.expandToggleText}>
            {expandOil ? "Collapse" : "Add Oil Type"}
          </Text>
        </TouchableOpacity>

        {expandOil && (
          <View style={styles.formCard}>
            <FormField
              label="Oil Type Name"
              placeholder="Synthetic"
              value={newOilName}
              onChangeText={setNewOilName}
              editable={!createOilType.isPending}
            />
            <FormField
              label="Suggested Interval (km)"
              placeholder="1250"
              value={newOilIntervalKm}
              onChangeText={setNewOilIntervalKm}
              keyboardType="number-pad"
              editable={!createOilType.isPending}
            />
            <PrimaryButton onPress={handleCreateOil} loading={createOilType.isPending}>
              Add Oil Type
            </PrimaryButton>
          </View>
        )}

        <Text style={[styles.sectionHeading, styles.sectionSpacing]}>Account</Text>
        <View style={styles.accountCard}>
          {user?.email && <Text style={styles.accountEmail}>{user.email}</Text>}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  typeName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  typeDetail: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  expandToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.accent,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  accountCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 16,
    marginBottom: 32,
  },
  accountEmail: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 14,
  },
  logoutButton: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
