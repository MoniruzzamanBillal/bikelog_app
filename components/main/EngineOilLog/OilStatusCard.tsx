import { Panel } from "@/components/main/shared/Panel";
import { toneStyle, TStatusTone } from "@/components/main/shared";
import { TEngineOilStatus } from "@/types/engine-oil-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate } from "@/utils/formatApiDate";
import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface OilStatusCardProps {
  status?: TEngineOilStatus;
}

const STATUS_TONE: Record<TEngineOilStatus["status"], TStatusTone> = {
  ok: "success",
  upcoming: "warning",
  overdue: "danger",
  unknown: "neutral",
};

// ! `unknown` only ever reaches the pill on a change that exists but carries no interval
// ! (server `evaluateOilDue` returns it when `nextDueOdometer` is null) — a bike with no
// ! change at all renders no card. So the honest label is about the DUE DATE being
// ! unknown, not the data.
const STATUS_LABEL: Record<TEngineOilStatus["status"], string> = {
  ok: "On track",
  upcoming: "Due soon",
  overdue: "Overdue",
  unknown: "No due date",
};

/**
 * ! H-C: `projectedDueDate` is a genuine instant (`new Date(Date.now() + days * DAY_MS)`
 * ! server-side), NOT one of the backend's UTC-midnight date-only fields. Pushing it
 * ! through `parseApiDate` would read its UTC calendar day, which is a day behind Dhaka
 * ! local between 00:00 and 06:00. Same `toDate` guard `RemindersBanner` uses for exactly
 * ! this field, `Number.isNaN` check included.
 */
function toDate(value?: string | null): Date | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ! The `~` is load-bearing, not decoration: server H5 floors the day count because
 * ! `currentOdometer` lags reality between logs, so the date sits late (spec 55 H-F's
 * ! argument, one screen over).
 * ! Never a named weekday (spec 55 H-G) — the Dhaka weekend is Friday–Saturday and may be
 * ! the non-riding days, so a date landing there is not a day the oil runs out.
 */
function headline(projected: Date | null, kmRemaining: number): string {
  // ! §B row 3: with no usable riding rate the server omits the projection entirely, so the
  // ! distance is promoted to the headline — exactly `TankForecastCard`'s `halfDate`
  // ! fallback. Never an unhedged guess in its place.
  if (!projected) return `~${kmRemaining.toLocaleString()} km to go`;
  return `Next change ~ ${format(projected, "d MMM")}`;
}

function subLine(days: number, kmRemaining: number): string {
  const when = days <= 0 ? "any day now" : days === 1 ? "tomorrow" : `in ${days} days`;
  return `${when} · ~${kmRemaining.toLocaleString()} km to go`;
}

/**
 * The oil-change forecast: how far this oil has run, and when the next change falls due
 * (spec 57 §B). Everything it renders is computed server-side.
 *
 * ! H-B: the app computes NO projection here. Two sources of truth for one figure disagree
 * ! on the same screen and the disagreement is invisible until the rider reports it
 * ! (spec 53 H-E). `/status` returns `projectedDaysRemaining`, `projectedDueDate` and
 * ! `kmPerDay` ready to render — render them. Note the contrast with spec 55, where
 * ! client-side arithmetic *is* allowed: there the server computes no tank forecast at all.
 * ! Don't reach for `useTankForecast`'s `computeKmPerDay` on this screen.
 *
 * ! H-H: unlike `TankForecastCard`, this card DOES carry a status pill — the server returns
 * ! a real four-valued `status` and `overdue` is a genuine alert, not a forecast. The two
 * ! cards sit on sibling screens looking different on purpose; a later "consistency" pass
 * ! must not strip the pill.
 *
 * ! H-G: `RemindersBanner` is deliberately NOT rendered on this screen. The same overdue
 * ! oil six lines apart in two visual languages is worse than either alone — this card is
 * ! the screen's alert surface, and reminders stay the hub's job.
 */
export function OilStatusCard({ status }: OilStatusCardProps) {
  const last = status?.lastChange;

  // ! §B row 1 / H-F: no oil change yet → no card at all, exactly as `TankForecastCard`
  // ! returns null for `unavailable`. The list's own EmptyState below already carries the
  // ! icon, the explanation and the Add button; two empty boxes stacked is worse than one.
  if (!status || !last) return null;

  const tone = toneStyle(STATUS_TONE[status?.status] ?? "neutral");
  const isOverdue = status?.status === "overdue";

  const kmSince = status?.kmSinceChange;
  const kmRemaining = status?.kmRemaining;
  const percentUsed = status?.percentUsed;
  const projected = toDate(status?.projectedDueDate);
  const days = status?.projectedDaysRemaining;

  const oilName = last?.oilType?.name;
  const sinceLine = [
    `since ${formatApiDate(last?.changeDate, "d MMM")}`,
    oilName,
    status?.kmPerDay != null ? `${status?.kmPerDay.toFixed(1)} km/day` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ! H-F row 2: one of server §H's imported changes whose source maintenance log had no
  // ! interval. No due point exists, so there is no bar, no date and nothing to project —
  // ! just the distance run and a nudge. Tapping the nudge is deliberately not wired; the
  // ! rider edits the row.
  const hasInterval = last?.intervalKm != null;

  return (
    <Panel style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Engine oil</Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.text }]}>
            {STATUS_LABEL[status?.status] ?? STATUS_LABEL.unknown}
          </Text>
        </View>
      </View>

      {!hasInterval ? (
        <>
          <Text style={styles.headline}>
            {kmSince != null ? `${kmSince.toLocaleString()} km on this oil` : "—"}
          </Text>
          <Text style={styles.nudge}>
            Set an interval on this change to get a due date.
          </Text>
        </>
      ) : isOverdue ? (
        <>
          {/* ! H-E: `kmRemaining` from /status is SIGNED and deliberately unclamped, unlike
              ! the reminders endpoint's `Math.max(0, …)`. Take its absolute value — never
              ! reconstruct the overshoot from `currentOdometer - nextDueOdometer`, which
              ! `getDistanceLine` has to do and which would double-count it here. The server
              ! omits the projected date when overdue, so there is none to show. */}
          <Text style={[styles.headline, styles.overdue]}>
            {kmRemaining != null
              ? `${Math.abs(kmRemaining).toLocaleString()} km past due`
              : "Overdue"}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.headline}>
            {headline(projected, kmRemaining ?? 0)}
          </Text>
          {/* ! `projected` gates the sub-line too: with no rate there is no honest "in N
              ! days", and the headline above has already been promoted to the distance. */}
          {projected && days != null && (
            <Text style={styles.sub}>{subLine(days, kmRemaining ?? 0)}</Text>
          )}
        </>
      )}

      {/* ! Two nested Views, not paper's ProgressBar — that brings its own theming and
          ! can't take the danger/warning tone cleanly. Clamped at 100 so an overdue oil
          ! doesn't overflow the track, and omitted entirely when `percentUsed` is absent. */}
      {percentUsed != null && (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, Math.max(0, percentUsed))}%`,
                backgroundColor: tone.text,
              },
            ]}
          />
        </View>
      )}

      {/* ! The audit lines STAY (spec 55 D7). H-F guarantees this card will eventually read
          ! wrong — `currentOdometer` lags between logs — and the audit lines are what let
          ! the rider see why rather than stop trusting it. */}
      <View style={styles.auditBlock}>
        {kmSince != null && hasInterval && (
          <Text style={styles.audit}>
            {kmSince.toLocaleString()} / {last?.intervalKm?.toLocaleString()} km on
            this oil
            {percentUsed != null ? ` · ${Math.round(percentUsed)}%` : ""}
          </Text>
        )}
        <Text style={styles.audit}>{sinceLine}</Text>
      </View>
    </Panel>
  );
}

// ! D14: one notch down from `TankForecastCard`, and one notch only. Nothing goes below
// ! 10px — the kicker and the audit lines are already at 55a's device-measured floor, so
// ! they are unchanged. No second pass down without a device look (V21).
const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 1,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  heading: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  overdue: {
    color: COLORS.danger,
  },
  sub: {
    fontSize: 10.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.edge,
    marginTop: 8,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  auditBlock: {
    marginTop: 6,
    gap: 1,
  },
  audit: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  nudge: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 5,
  },
});
