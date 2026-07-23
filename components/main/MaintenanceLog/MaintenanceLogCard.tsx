import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { useDelete } from "@/hooks/useApi";
import { TMaintenanceType } from "@/types/catalog.types";
import { TMaintenanceLog } from "@/types/maintenance-log.types";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaintenanceLogFormModal } from "./MaintenanceLogFormModal";

interface MaintenanceLogCardProps {
  log: TMaintenanceLog;
  bikeId: string;
  maintenanceTypes: TMaintenanceType[];
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

function getTypeName(
  log: TMaintenanceLog,
  maintenanceTypes: TMaintenanceType[],
): string {
  if (typeof log.maintenanceType === "object" && log.maintenanceType?.name) {
    return log.maintenanceType.name;
  }
  const typeId =
    typeof log.maintenanceType === "string" ? log.maintenanceType : undefined;
  return maintenanceTypes.find((t) => t._id === typeId)?.name ?? "Maintenance";
}

export function MaintenanceLogCard({
  log,
  bikeId,
  maintenanceTypes,
  openSwipeableRef,
}: MaintenanceLogCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([
    ["maintenanceLogs", bikeId],
    ["reminders", bikeId],
  ]);

  const handleSwipeableWillOpen = () => {
    if (
      openSwipeableRef.current &&
      openSwipeableRef.current !== swipeableRef.current
    ) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = swipeableRef.current;
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    confirmDelete("maintenance log", async () => {
      await deleteMutation.mutateAsync({
        url: `/bikes/${bikeId}/maintenance-logs/${log._id}`,
      });
    });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    setEditOpen(true);
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        renderLeftActions={() => (
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.action, styles.editAction]}
          >
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.action, styles.deleteAction]}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          onPress={handleEdit}
          style={styles.card}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.typeName}>
              {getTypeName(log, maintenanceTypes)}
            </Text>
            <Text style={styles.date}>
              {format(new Date(log.serviceDate), "dd MMM yyyy")}
            </Text>
          </View>
          <Text style={styles.odometer}>
            Odometer: {log.odometerReading.toLocaleString()} km
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detail}>
              Cost: ৳{log.cost.toLocaleString()}
            </Text>
            <Text style={styles.detail}>
              Interval: {log.intervalKmUsed.toLocaleString()} km
            </Text>
          </View>
          <Text style={styles.detail}>
            Next due: {log.nextDueOdometer.toLocaleString()} km
          </Text>
          {log.serviceCenter && (
            <Text style={styles.detail}>At: {log.serviceCenter}</Text>
          )}
          {log.partsReplaced && log.partsReplaced.length > 0 && (
            <Text style={styles.detail}>
              Parts: {log.partsReplaced.join(", ")}
            </Text>
          )}
          {log.notes && <Text style={styles.notes}>{log.notes}</Text>}
        </TouchableOpacity>
      </Swipeable>

      <MaintenanceLogFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        log={log}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  typeName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  date: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  odometer: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 2,
  },
  detail: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  notes: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: "italic",
    marginTop: 6,
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 6,
  },
  editAction: {
    backgroundColor: COLORS.success,
  },
  deleteAction: {
    backgroundColor: COLORS.danger,
  },
  actionText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});
