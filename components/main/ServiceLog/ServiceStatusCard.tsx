import { Panel } from "@/components/main/shared/Panel";
import { toneStyle } from "@/components/main/shared";
import { TServiceStatus } from "@/types/service-log.types";
import { COLORS } from "@/utils/colors";
import { formatApiDate, parseApiDate } from "@/utils/formatApiDate";
import { differenceInCalendarDays } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface ServiceStatusCardProps {
  status?: TServiceStatus;
}

// ! Date-only diff on a stored calendar day (H-C uses formatApiDate/parseApiDate, never the
// ! instant path). This is NOT a warranty figure — H-B forbids re-deriving "X of 5" or the
// ! due date, both of which come straight from /status; a plain day count off a date the
// ! server already decided is `overdue`/`upcoming` is allowed (spec 73 §B card note).
const daysUntil = (dateStr: string): number =>
  differenceInCalendarDays(parseApiDate(dateStr), new Date());

// ! The `~` is load-bearing (spec 55 H-F): the due date is the centre's estimate, not a
// ! promise. Never a named weekday (spec 55 H-G) — the Dhaka weekend is Fri–Sat.
const whenLine = (days: number): string => {
  if (days <= 0) return "due now";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
};

/**
 * The warranty progress card (spec 73 §B) — this screen's alert surface and the whole reason
 * to open it: how many of the 5 mandatory services are done, when the next falls due, and
 * whether a missed one is about to void the warranty.
 *
 * ! H-B: no client arithmetic on warranty counts or due dates — every number comes from
 * ! /status. The only app-side work is formatApiDate on the dates, a date-only day count, and
 * ! the `5 - warrantyCompleted` display subtraction.
 * ! H-G: RemindersBanner is deliberately NOT rendered here — this card is the alert surface;
 * ! reminders stay the hub's job.
 */
export function ServiceStatusCard({ status }: ServiceStatusCardProps) {
  if (!status) return null;

  const {
    warrantyCompleted,
    warrantyLogged,
    warrantyVoidRisk,
    nextWarranty,
    nextService,
  } = status;

  // ! H-H row 1 / state "no services at all": no warranty rows AND nothing scheduled of any
  // ! kind → no card. The list's own EmptyState below carries the icon, the copy and the Add
  // ! button; two empty boxes stacked is worse than one.
  if (warrantyLogged === 0 && nextWarranty == null && nextService == null) {
    return null;
  }

  const left = 5 - warrantyCompleted;
  const warrantyDone = warrantyCompleted >= 5;

  // ! State 3 — void risk. The one money-bearing alert in the app, driven by the server's
  // ! `warrantyVoidRisk`, never a client date compare on the list (H-B).
  if (warrantyVoidRisk && nextWarranty != null) {
    const danger = toneStyle("danger");
    const daysPast = Math.abs(daysUntil(nextWarranty.dueDate));
    return (
      <Panel style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Warranty service</Text>
          <View style={[styles.pill, { backgroundColor: danger.bg }]}>
            <Text style={[styles.pillText, { color: danger.text }]}>Overdue</Text>
          </View>
        </View>
        <Text style={[styles.headline, styles.danger]}>
          Warranty service #{nextWarranty.number ?? warrantyCompleted + 1} is
          overdue
        </Text>
        <Text style={styles.sub}>
          {daysPast === 1 ? "1 day" : `${daysPast} days`} past the due date (~
          {formatApiDate(nextWarranty.dueDate, "d MMM")})
        </Text>
        {renderBar(warrantyCompleted, danger.text)}
        <Text style={[styles.footer, styles.danger]}>
          Book it now — missing a service voids the warranty.
        </Text>
      </Panel>
    );
  }

  // ! State 4 — all 5 warranty services done. A resting state: no X-of-5 pressure, no void
  // ! footer, no bar. Shows the next regular service if one is scheduled (H-H row 4).
  if (warrantyDone) {
    const neutral = toneStyle("success");
    return (
      <Panel style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Warranty service</Text>
          <View style={[styles.pill, { backgroundColor: neutral.bg }]}>
            <Text style={[styles.pillText, { color: neutral.text }]}>
              Warranty complete
            </Text>
          </View>
        </View>
        {nextService != null ? (
          <>
            <Text style={styles.headline}>
              Next service ~ {formatApiDate(nextService.dueDate, "d MMM")}
            </Text>
            <Text style={styles.sub}>{whenLine(daysUntil(nextService.dueDate))}</Text>
          </>
        ) : (
          <Text style={styles.headline}>All 5 warranty services done</Text>
        )}
      </Panel>
    );
  }

  // ! State 2 — warranty in progress, none overdue. Also State 5's warranty-untouched-but-
  // ! regular-exists case when `nextWarranty` is present (warrantyCompleted may be 0).
  if (nextWarranty != null) {
    const success = toneStyle("success");
    const days = daysUntil(nextWarranty.dueDate);
    return (
      <Panel style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Warranty service</Text>
          <View style={[styles.pill, { backgroundColor: success.bg }]}>
            <Text style={[styles.pillText, { color: success.text }]}>
              {warrantyCompleted} of 5
            </Text>
          </View>
        </View>
        <Text style={styles.headline}>
          Next service #{nextWarranty.number ?? warrantyCompleted + 1} ~{" "}
          {formatApiDate(nextWarranty.dueDate, "d MMM")}
        </Text>
        <Text style={styles.sub}>
          {whenLine(days)}
          {nextWarranty.status === "overdue" ? " · overdue" : ""}
        </Text>
        {renderBar(warrantyCompleted, success.text)}
        <Text style={styles.footer}>
          {left === 1 ? "1 service" : `${left} services`} left to keep the
          warranty
        </Text>
      </Panel>
    );
  }

  // ! State 5 — regular-only resting state: warranty untouched, nothing warranty-scheduled,
  // ! but a regular service is coming up. No warranty framing at all.
  if (nextService != null) {
    const neutral = toneStyle("neutral");
    return (
      <Panel style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Service</Text>
          <View style={[styles.pill, { backgroundColor: neutral.bg }]}>
            <Text style={[styles.pillText, { color: neutral.text }]}>
              Scheduled
            </Text>
          </View>
        </View>
        <Text style={styles.headline}>
          Next service ~ {formatApiDate(nextService.dueDate, "d MMM")}
        </Text>
        <Text style={styles.sub}>
          {whenLine(daysUntil(nextService.dueDate))}
          {nextService.status === "overdue" ? " · overdue" : ""}
        </Text>
      </Panel>
    );
  }

  // ! Warranty rows logged but none upcoming and nothing scheduled (e.g. between a completed
  // ! warranty service and scheduling the next). Show progress without a due date.
  const success = toneStyle("success");
  return (
    <Panel style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.heading}>Warranty service</Text>
        <View style={[styles.pill, { backgroundColor: success.bg }]}>
          <Text style={[styles.pillText, { color: success.text }]}>
            {warrantyCompleted} of 5
          </Text>
        </View>
      </View>
      <Text style={styles.headline}>Schedule your next warranty service</Text>
      {renderBar(warrantyCompleted, success.text)}
      <Text style={styles.footer}>
        {left === 1 ? "1 service" : `${left} services`} left to keep the warranty
      </Text>
    </Panel>
  );
}

// ! Two nested Views, not paper's ProgressBar — that brings its own theming and can't take
// ! the tone colour cleanly. Clamped so it can't overflow the track.
function renderBar(completed: number, color: string) {
  const pct = Math.min(100, Math.max(0, (completed / 5) * 100));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

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
    fontWeight: "600",
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
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  danger: {
    color: COLORS.danger,
  },
  sub: {
    fontSize: 10.5,
    fontWeight: "500",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginTop: 5,
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
});
