import { DatePickerField, FormField, PrimaryButton } from "@/components/main/shared";
import { COLORS } from "@/utils/colors";
import { formatTaka } from "@/utils/formatTaka";
import { StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

// ! Local row shapes for the two in-modal sub-editors (spec 73 §D). `cost` stays a STRING in
// ! state (parsed only at submit, like every numeric field in this app — no react-hook-form).
// ! `id` is preserved across a round-trip edit so the server keeps the same sub-entry id and
// ! the reminder it keys on does not churn (H-E).
export type TItemRow = { id?: string; name: string; cost: string };
export type TRecommendationRow = {
  id?: string;
  text: string;
  targetDate: string; // "yyyy-MM-dd" or ""
  done: boolean;
};

interface ItemsEditorProps {
  items: TItemRow[];
  onChange: (rows: TItemRow[]) => void;
  disabled?: boolean;
}

/**
 * Line items — paid additives/accessories on a completed service. Zero items = a free
 * service (§67 Decision 2). A running subtotal sits under the list for the rider's sanity.
 */
export function ItemsEditor({ items, onChange, disabled }: ItemsEditorProps) {
  const update = (index: number, patch: Partial<TItemRow>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const add = () => {
    onChange([...items, { name: "", cost: "" }]);
  };

  const subtotal = items.reduce((sum, row) => {
    const n = parseFloat(row.cost);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>Line items</Text>
      {items.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.nameCol}>
            <FormField
              label={index === 0 ? "Item" : " "}
              placeholder="Carbon cleaner"
              value={row.name}
              onChangeText={(v) => update(index, { name: v })}
              editable={!disabled}
              style={styles.noMargin}
            />
          </View>
          <View style={styles.costCol}>
            <FormField
              label={index === 0 ? "Cost (৳)" : " "}
              placeholder="300"
              value={row.cost}
              onChangeText={(v) => update(index, { cost: v })}
              keyboardType="decimal-pad"
              editable={!disabled}
              style={styles.noMargin}
            />
          </View>
          <IconButton
            icon="close"
            size={16}
            iconColor={COLORS.textLight}
            onPress={() => remove(index)}
            disabled={disabled}
            style={styles.removeBtn}
          />
        </View>
      ))}

      {items.length > 0 && (
        <Text style={styles.subtotal}>Total {formatTaka(subtotal)}</Text>
      )}

      <PrimaryButton
        onPress={add}
        variant="secondary"
        icon="plus"
        compact
        disabled={disabled}
      >
        Add item
      </PrimaryButton>
    </View>
  );
}

interface RecommendationsEditorProps {
  recommendations: TRecommendationRow[];
  onChange: (rows: TRecommendationRow[]) => void;
  disabled?: boolean;
}

/**
 * Technician recommendations for the future. `done` is NOT edited here — it is toggled from
 * the card (§G); the form is for authoring, the card for ticking off. Each row keeps its `id`
 * on edit (H-E).
 */
export function RecommendationsEditor({
  recommendations,
  onChange,
  disabled,
}: RecommendationsEditorProps) {
  const update = (index: number, patch: Partial<TRecommendationRow>) => {
    onChange(
      recommendations.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };
  const remove = (index: number) => {
    onChange(recommendations.filter((_, i) => i !== index));
  };
  const add = () => {
    onChange([...recommendations, { text: "", targetDate: "", done: false }]);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>Recommendations</Text>
      {recommendations.map((row, index) => (
        <View key={index} style={styles.recRow}>
          <View style={styles.recTextRow}>
            <View style={styles.recTextCol}>
              <FormField
                label={index === 0 ? "Recommendation" : " "}
                placeholder="Change air filter next service"
                value={row.text}
                onChangeText={(v) => update(index, { text: v })}
                editable={!disabled}
                style={styles.noMargin}
              />
            </View>
            <IconButton
              icon="close"
              size={16}
              iconColor={COLORS.textLight}
              onPress={() => remove(index)}
              disabled={disabled}
              style={styles.removeBtn}
            />
          </View>
          {/* ! no maximumDate — recommendations point forward. */}
          <DatePickerField
            label="Target date (optional)"
            value={row.targetDate}
            onChange={(v) => update(index, { targetDate: v })}
            disabled={disabled}
            style={styles.noMargin}
          />
        </View>
      ))}

      <PrimaryButton
        onPress={add}
        variant="secondary"
        icon="plus"
        compact
        disabled={disabled}
      >
        Add recommendation
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 10,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: "rgba(233,233,237,0.7)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  nameCol: {
    flex: 2,
  },
  costCol: {
    flex: 1,
  },
  removeBtn: {
    margin: 0,
    marginBottom: 2,
  },
  noMargin: {
    marginBottom: 0,
  },
  subtotal: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
    alignSelf: "flex-end",
  },
  recRow: {
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  recTextRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  recTextCol: {
    flex: 1,
  },
});
