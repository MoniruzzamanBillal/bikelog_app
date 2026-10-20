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
 * ! Spec 59 §B: an overdue change now gets a date too, and it is in the PAST — the day the
 * ! oil is estimated to have hit its due point. "Was due ~ 3 Oct" is the one thing the card
 * ! can say that tells the rider *how stale* the oil is in units they think in; "1,400 km
 * ! past due" is true but needs mental arithmetic against their own riding to mean anything.
 * ! Falls back to the distance when the server could not derive any rate at all.
 */
function overdueHeadline(projected: Date | null, kmRemaining?: number | null): string {
  if (projected) return `Was due ~ ${format(projected, "d MMM")}`;
  if (kmRemaining != null) {
    return `${Math.abs(kmRemaining).toLocaleString()} km past due`;
  }
  return "Overdue";
}

function overdueSubLine(
  overdueDays?: number | null,
  kmRemaining?: number | null,
): string | null {
  // ! H-E again: `kmRemaining` is SIGNED and unclamped here, so take its absolute value —
  // ! never reconstruct the overshoot from `currentOdometer - nextDueOdometer`.
  const distance =
    kmRemaining != null
      ? `~${Math.abs(kmRemaining).toLocaleString()} km past due`
      : null;

  const when =
    overdueDays == null
      ? null
      : overdueDays <= 0
        ? "due now"
        : overdueDays === 1
          ? "1 day past due"
          : `${overdueDays} days past due`;

  const parts = [when, distance].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * ! Spec 59 §B: the server will now project a date off a coarser figure than the strict
 * ! 28-day rate when that rate is unavailable, and `rateBasis.source` says which. The card
 * ! says so rather than passing a lifetime average off as this month's riding — the date is
 * ! the same kind of estimate either way, but the rider can only judge it if they know what
 * ! it was measured over.
 */
const RATE_NOTE: Record<string, string> = {
  history: " long-run avg",
  lifetime: " lifetime avg",
};

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

  const kmSince = status?.kmSinceChange;

  // ! H-F row 2: one of server §H's imported changes whose source maintenance log had no
  // ! interval, or any change logged before spec 54 started seeding `intervalKmUsed`. No
  // ! due point is stored, so none of the real forecast fields exist.
  const hasInterval = last?.intervalKm != null;

  // ! Spec 59 §C: that used to be the end of it — the card said "set an interval to get a
  // ! due date" and showed none, which is exactly the gap the developer reported. The
  // ! server now sends a PROVISIONAL forecast for that case, derived from the oil type's
  // ! current `suggestedIntervalKm`. When it is there it drives the whole card, pill
  // ! included, and every line it produces is marked `est.` — it moves if the catalog is
  // ! edited, so it must never be mistaken for the frozen figure a real interval gives.
  const estimate = !hasInterval ? status?.estimate : null;

  const shownStatus = estimate ? estimate.status : status?.status;
  const tone = toneStyle(STATUS_TONE[shownStatus ?? "unknown"] ?? "neutral");
  const isOverdue = shownStatus === "overdue";

  const kmRemaining = estimate ? estimate.kmRemaining : status?.kmRemaining;
  const percentUsed = estimate ? estimate.percentUsed : status?.percentUsed;
  const projected = toDate(
    estimate ? estimate.projectedDueDate : status?.projectedDueDate,
  );
  const days = estimate
    ? estimate.projectedDaysRemaining
    : status?.projectedDaysRemaining;
  const overdueDays = estimate ? estimate.overdueDays : status?.overdueDays;
  const intervalKm = estimate ? estimate.intervalKm : last?.intervalKm;

  // ! Nothing to forecast from at all: no stored interval AND no oil type to borrow a
  // ! suggestion from. The distance run is still worth showing, with the nudge that fixes it.
  const nothingToProject = !hasInterval && !estimate;

  const oilName = last?.oilType?.name;
  const rateNote =
    status?.rateBasis?.source != null
      ? (RATE_NOTE[status?.rateBasis?.source] ?? "")
      : "";
  const sinceLine = [
    `since ${formatApiDate(last?.changeDate, "d MMM")}`,
    oilName,
    status?.kmPerDay != null
      ? `${status?.kmPerDay.toFixed(1)} km/day${rateNote}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Panel style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Engine oil</Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.text }]}>
            {STATUS_LABEL[shownStatus ?? "unknown"] ?? STATUS_LABEL.unknown}
            {estimate ? " · est." : ""}
          </Text>
        </View>
      </View>

      {nothingToProject ? (
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
              ! the reminders endpoint's `Math.max(0, …)`. Spec 59 added the date, which the
              ! server now sends for this state too — in the past. */}
          <Text style={[styles.headline, styles.overdue]}>
            {overdueHeadline(projected, kmRemaining)}
          </Text>
          {/* ! only when the date carried the headline — otherwise the headline IS the
              ! distance and the sub-line would just repeat it. */}
          {projected && (
            <Text style={styles.sub}>
              {overdueSubLine(overdueDays, kmRemaining)}
            </Text>
          )}
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
          ! the rider see why rather than stop trusting it. Spec 59 gives the estimate its
          ! own version of the first line: same figures, explicitly labelled, plus the one
          ! sentence that says where the interval came from and how to make it real. */}
      <View style={styles.auditBlock}>
        {kmSince != null && intervalKm != null && (
          <Text style={styles.audit}>
            {kmSince.toLocaleString()} / {intervalKm?.toLocaleString()} km on this
            oil
            {percentUsed != null ? ` · ${Math.round(percentUsed)}%` : ""}
            {estimate ? " · est." : ""}
          </Text>
        )}
        <Text style={styles.audit}>{sinceLine}</Text>
        {estimate && (
          <Text style={styles.nudge}>
            Estimated from {oilName ?? "this oil"}&apos;s{" "}
            {estimate.intervalKm?.toLocaleString()} km interval — set one on this
            change to make it exact.
          </Text>
        )}
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
