import { BikeFormModal } from "@/components/main/Bike/BikeFormModal";
import { confirmDelete } from "@/components/main/shared/ConfirmDelete";
import { glowStyle, panelStyle } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared/StatusBadge";
import { useDelete } from "@/hooks/useApi";
import { TBike } from "@/types/bike.types";
import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Text } from "react-native-paper";

interface BikeCardProps {
  bike: TBike;
  /** The first card carries the accent glow, like the web's `highlight`. */
  highlight?: boolean;
  openSwipeableRef: React.MutableRefObject<SwipeableMethods | null>;
}

export function BikeCard({
  bike,
  highlight,
  openSwipeableRef,
}: BikeCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);

  const deleteMutation = useDelete([["bikes"]]);

  const logged = bike.currentOdometer - (bike.initialOdometer ?? 0);
  const since = bike.purchaseDate
    ? format(new Date(bike.purchaseDate), "MMM yyyy")
    : "—";

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
    confirmDelete("bike", async () => {
      await deleteMutation.mutateAsync({ url: `/bikes/${bike._id}` });
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
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={COLORS.success}
            />
            <Text style={[styles.actionText, { color: COLORS.success }]}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
        renderRightActions={() => (
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.action, styles.deleteAction]}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={COLORS.danger}
            />
            <Text style={[styles.actionText, { color: COLORS.danger }]}>
              Delete
            </Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/bikes/[bikeId]",
              params: { bikeId: bike._id },
            })
          }
          style={[styles.card, highlight && styles.cardGlow]}
          activeOpacity={0.85}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.nickname} numberOfLines={1}>
                {bike.nickname}
              </Text>
              <Text style={styles.model} numberOfLines={1}>
                {bike.brand} {bike.model}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={COLORS.textLight}
            />
          </View>

          <View style={styles.odoRow}>
            <View style={styles.odoValue}>
              <Text style={styles.odometer}>
                {bike.currentOdometer.toLocaleString()}
              </Text>
              <Text style={styles.odometerUnit}>km</Text>
            </View>
            <View style={styles.regTag}>
              <Text style={styles.regTagText} numberOfLines={1}>
                {bike.registrationNumber}
              </Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {logged.toLocaleString()} km logged · {bike.fuelTankCapacityLiters} L
            tank · Since {since}
          </Text>
        </TouchableOpacity>
      </Swipeable>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialBike={bike}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    ...panelStyle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  cardGlow: glowStyle,
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  model: {
    fontSize: 12.5,
    color: COLORS.textLight,
  },
  odoRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  odoValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  odometer: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  odometerUnit: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  regTag: {
    maxWidth: "45%",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: toneStyle("neutral").bg,
  },
  regTagText: {
    fontSize: 11,
    color: toneStyle("neutral").text,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    width: 80,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 2,
  },
  editAction: {
    backgroundColor: tint(COLORS.success, 0.12),
    borderColor: tint(COLORS.success, 0.4),
  },
  deleteAction: {
    backgroundColor: tint(COLORS.danger, 0.12),
    borderColor: tint(COLORS.danger, 0.4),
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
