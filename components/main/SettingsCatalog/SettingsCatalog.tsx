import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Button, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { EmptyState, SectionLoading } from "@/components/main/shared";
import { useFetchData, usePost } from "@/hooks/useApi";
import { COLORS } from "@/utils/colors";
import {
  TMaintenanceType,
  TEngineOilType,
} from "@/types/catalog.types";

export function SettingsCatalog() {
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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Maintenance Catalog</Text>

      {/* Maintenance Types Section */}
      <Text style={styles.sectionTitle}>Maintenance Types</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setExpandMaint(!expandMaint)}
      >
        <MaterialCommunityIcons
          name={expandMaint ? "chevron-up" : "plus-circle-outline"}
          size={20}
          color={COLORS.primary}
        />
        <Text style={styles.addButtonText}>
          {expandMaint ? "Collapse" : "Add Maintenance Type"}
        </Text>
      </TouchableOpacity>

      {expandMaint && (
        <View style={styles.formContainer}>
          <View style={styles.field}>
            <TextInput
              placeholder="Type Name"
              value={newMaintName}
              onChangeText={setNewMaintName}
              editable={!createMaintType.isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <TextInput
              placeholder="Default Interval (km, optional)"
              value={newMaintIntervalKm}
              onChangeText={setNewMaintIntervalKm}
              keyboardType="number-pad"
              editable={!createMaintType.isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <TextInput
              placeholder="Default Interval (days, optional)"
              value={newMaintIntervalDays}
              onChangeText={setNewMaintIntervalDays}
              keyboardType="number-pad"
              editable={!createMaintType.isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>
          <Button
            mode="contained"
            onPress={handleCreateMaint}
            loading={createMaintType.isPending}
            disabled={createMaintType.isPending}
            style={styles.formButton}
            labelStyle={{ color: COLORS.white }}
          >
            Add Type
          </Button>
        </View>
      )}

      {maintLoading ? (
        <SectionLoading count={3} />
      ) : maintTypes.length === 0 ? (
        <EmptyState label="No maintenance types yet." />
      ) : (
        maintTypes.map((type) => (
          <View key={type._id} style={styles.typeCard}>
            <Text style={styles.typeName}>{type.name}</Text>
            <View style={styles.typeDetails}>
              {type.defaultIntervalKm && (
                <Text style={styles.typeDetail}>Every {type.defaultIntervalKm} km</Text>
              )}
              {type.defaultIntervalDays && (
                <Text style={styles.typeDetail}>Every {type.defaultIntervalDays} days</Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Engine Oil Types Section */}
      <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Engine Oil Types</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setExpandOil(!expandOil)}
      >
        <MaterialCommunityIcons
          name={expandOil ? "chevron-up" : "plus-circle-outline"}
          size={20}
          color={COLORS.primary}
        />
        <Text style={styles.addButtonText}>
          {expandOil ? "Collapse" : "Add Oil Type"}
        </Text>
      </TouchableOpacity>

      {expandOil && (
        <View style={styles.formContainer}>
          <View style={styles.field}>
            <TextInput
              placeholder="Oil Type Name"
              value={newOilName}
              onChangeText={setNewOilName}
              editable={!createOilType.isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <TextInput
              placeholder="Suggested Interval (km)"
              value={newOilIntervalKm}
              onChangeText={setNewOilIntervalKm}
              keyboardType="number-pad"
              editable={!createOilType.isPending}
              textColor={COLORS.text}
              style={styles.input}
            />
          </View>
          <Button
            mode="contained"
            onPress={handleCreateOil}
            loading={createOilType.isPending}
            disabled={createOilType.isPending}
            style={styles.formButton}
            labelStyle={{ color: COLORS.white }}
          >
            Add Oil Type
          </Button>
        </View>
      )}

      {oilLoading ? (
        <SectionLoading count={3} />
      ) : oilTypes.length === 0 ? (
        <EmptyState label="No oil types yet." />
      ) : (
        oilTypes.map((oil) => (
          <View key={oil._id} style={styles.typeCard}>
            <Text style={styles.typeName}>{oil.name}</Text>
            <Text style={styles.typeDetail}>Every {oil.suggestedIntervalKm} km</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  formContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  field: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  input: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  formButton: {
    marginTop: 4,
  },
  typeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  typeDetails: {
    marginTop: 4,
  },
  typeDetail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
