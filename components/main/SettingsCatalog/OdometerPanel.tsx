import {
  FormField,
  Panel,
  PrimaryButton,
  SelectPickerField,
} from "@/components/main/shared";
import { useFetchData, usePatch } from "@/hooks/useApi";
import { TBike, TUpdateOdometerPayload } from "@/types/bike.types";
import { COLORS } from "@/utils/colors";
import { resolveBikeId } from "@/utils/lastUsedBike";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Toast from "react-native-toast-message";
import { PanelIcon } from "./PanelIcon";

const DECIMAL_REGEX = /^\d+(\.\d{0,2})?$/;

/**
 * Settings panel for setting a bike's latest odometer reading without logging fuel or
 * maintenance. The backend (spec 44) refuses anything below the current reading; the same
 * rule is checked here first so the rider gets the message without a round trip.
 */
export function OdometerPanel() {
  const { data } = useFetchData<TBike[]>(["bikes"], "/bikes");
  // prefix keys: ["bikes"] also covers ["bikes", bikeId], ["reminders"] covers ["reminders", bikeId]
  const updateOdometer = usePatch([["bikes"], ["reminders"]]);

  const bikes = data?.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reading, setReading] = useState("");

  // default to the last-used bike (or the only one), else the first
  useEffect(() => {
    if (selectedId || !data?.data?.length) return;
    resolveBikeId(data.data).then((id) => {
      setSelectedId(id ?? data.data[0]?._id);
    });
  }, [data, selectedId]);

  const bike = bikes.find((b) => b?._id === selectedId) ?? bikes[0];
  const current = bike?.currentOdometer ?? 0;

  const handleSubmit = async () => {
    if (!bike || !reading.trim()) return;

    if (!DECIMAL_REGEX.test(reading.trim())) {
      Toast.show({
        type: "error",
        text1: "Enter a valid odometer reading",
        position: "top",
      });
      return;
    }
    const value = parseFloat(reading);
    if (value < current) {
      Toast.show({
        type: "error",
        text1: `Must be at least ${current?.toLocaleString()} km`,
        position: "top",
      });
      return;
    }

    const payload: TUpdateOdometerPayload = { currentOdometer: value };
    try {
      await updateOdometer.mutateAsync({
        url: `/bikes/${bike?._id}/odometer`,
        payload,
      });
      Toast.show({
        type: "success",
        text1: "Odometer updated",
        position: "top",
      });
      setReading("");
    } catch {
      // ! utils/axiosInstance.ts's response interceptor already toasts the API error — a
      // ! second Toast.show here would double it (see spec 45 Design §"pre-existing issues").
    }
  };

  return (
    <Panel style={styles.panel}>
      <View style={styles.panelHeader}>
        <PanelIcon name="speedometer" color={COLORS.primary} />
        <View style={styles.panelTitleCol}>
          <Text style={styles.panelTitle}>Odometer</Text>
          <Text style={styles.panelSub}>Set your bike&apos;s latest reading</Text>
        </View>
      </View>

      {!bike ? (
        <Text style={styles.empty}>Add a bike first.</Text>
      ) : (
        <View style={styles.form}>
          {bikes.length > 1 ? (
            <SelectPickerField
              label="Bike"
              value={bike?._id}
              onChange={setSelectedId}
              options={bikes.map((b) => ({ label: b?.nickname, value: b?._id }))}
            />
          ) : (
            <Text style={styles.bikeName}>{bike?.nickname}</Text>
          )}

          <Text style={styles.currentLabel}>
            Current:{" "}
            <Text style={styles.currentValue}>
              {current?.toLocaleString()} km
            </Text>
          </Text>

          <FormField
            label="New odometer reading (km)"
            value={reading}
            onChangeText={setReading}
            keyboardType="decimal-pad"
            placeholder={String(current)}
          />

          <PrimaryButton
            onPress={handleSubmit}
            loading={updateOdometer.isPending}
            disabled={!reading.trim()}
            icon="check"
          >
            Update odometer
          </PrimaryButton>
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
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
  form: {
    gap: 10,
    paddingTop: 4,
  },
  empty: {
    fontSize: 13,
    color: COLORS.textLight,
    paddingVertical: 8,
  },
  bikeName: {
    fontSize: 14,
    color: COLORS.text,
  },
  currentLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  currentValue: {
    color: COLORS.text,
    fontWeight: "500",
  },
});
