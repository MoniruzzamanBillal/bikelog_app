import { COLORS, tint } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Modal, Portal, Text } from "react-native-paper";

/**
 * The app's confirmation dialog — a Nocturne-styled replacement for the OS
 * `Alert.alert` this project used to use for every destructive confirm.
 *
 * ! Deliberately driven by a module-level store rather than per-screen state, so
 * ! `confirm()` keeps the same fire-and-forget imperative signature `Alert.alert`
 * ! had. That's what lets every existing `confirmDelete(...)` call site stay
 * ! untouched: a component can ask for a confirmation without owning any state,
 * ! rendering a dialog, or being a parent of one. `ConfirmDialogHost` is mounted
 * ! exactly once, in `app/_layout.tsx`.
 */

export type TConfirmTone = "danger" | "primary";

export type TConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: TConfirmTone;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onConfirm: () => Promise<void> | void;
};

type TListener = (request: TConfirmRequest | null) => void;

let current: TConfirmRequest | null = null;
const listeners = new Set<TListener>();

const emit = () => listeners.forEach((listener) => listener(current));

/** Open the confirmation dialog. Resolves nothing — `onConfirm` does the work. */
export const confirm = (request: TConfirmRequest) => {
  current = request;
  emit();
};

const closeConfirm = () => {
  current = null;
  emit();
};

const subscribe = (listener: TListener) => {
  listeners.add(listener);
  // ! braces matter: `Set.delete` returns a boolean, and a bare arrow would make this
  // ! a useEffect destructor that returns one, which React rejects.
  return () => {
    listeners.delete(listener);
  };
};

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<TConfirmRequest | null>(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribe(setRequest), []);

  // ! a fresh request must never inherit the previous one's spinner
  useEffect(() => {
    if (request) setBusy(false);
  }, [request]);

  const tone = request?.tone === "primary" ? COLORS.primary : COLORS.danger;

  const handleConfirm = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      // ! close regardless of outcome — the caller reports success/failure via
      // ! its own Toast, and leaving the dialog open on a rejection would strand
      // ! the user behind a spinner with no way back.
      closeConfirm();
    }
  };

  return (
    <Portal>
      <Modal
        visible={!!request}
        // ! a tap outside cancels, but not mid-request: dismissing while
        // ! `onConfirm` is in flight would hide a delete that still lands.
        onDismiss={busy ? undefined : closeConfirm}
        dismissable={!busy}
        contentContainerStyle={styles.modal}
      >
        <View
          style={[styles.iconRing, { backgroundColor: tint(tone, 0.14) }]}
        >
          <MaterialCommunityIcons
            name={request?.icon ?? "trash-can-outline"}
            size={22}
            color={tone}
          />
        </View>

        <Text style={styles.title}>{request?.title}</Text>

        {!!request?.message && (
          <Text style={styles.message}>{request?.message}</Text>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={closeConfirm}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              styles.cancel,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.cancelText}>
              {request?.cancelLabel ?? "Cancel"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tone },
              pressed && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator size={16} color={COLORS.white} />
            ) : (
              <Text style={styles.confirmText}>
                {request?.confirmLabel ?? "Delete"}
              </Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.edge,
    marginHorizontal: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  iconRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 7,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    alignSelf: "stretch",
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 14.5,
    fontWeight: "500",
    color: COLORS.text,
  },
  confirmText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.white,
  },
});
