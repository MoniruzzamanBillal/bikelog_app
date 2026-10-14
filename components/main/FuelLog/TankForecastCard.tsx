import { Panel } from "@/components/main/shared/Panel";
import { useTankForecast } from "@/hooks/useTankForecast";
import { COLORS } from "@/utils/colors";
import { format } from "date-fns";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface TankForecastCardProps {
  bikeId: string;
}

/**
 * ! The range sentence is fixed copy and identical in all three states that show it, so the
 * ! number is recognisably the same number wherever the rider meets it (Settled question 2).
 * ! It keeps the `~` because it moves with the mileage figure.
 * ! 55a: shortened from `You can ride ~240 km on half a tank` — the 13 leading characters
 * ! carried no information and are what stopped the range and its basis sharing one line.
 */
function rangeSentence(halfRangeKm: number): string {
  return `~${halfRangeKm.toLocaleString()} km on half a tank`;
}

/**
 * ! D4: the basis is named, never implied. A 40 → 45 km/L swing moves the half-range by
 * ! 30 km, so an unlabelled figure is one the rider cannot audit.
 * ! 55a: now rendered on the same line as the range — at 10px the pair is ~42 characters,
 * ! which fits 360dp where the old 12px/54-character pair did not.
 */
function basisLine(kmPerLiter: number, basis: "exact" | "approximate"): string {
  const label = basis === "exact" ? "exact" : "estimated";
  return `${kmPerLiter.toFixed(1)} km/L (${label})`;
}

/**
 * ! 55a: the date is the thing the rider asked for, so it is the headline in EVERY live
 * ! state that has one — the old copy printed a date only past 7 days and replaced it with
 * ! `in about 3 days` under that, which is precisely the range where the date is most
 * ! useful. The relative phrasing moves down to the sub-line, where it reads as a gloss on
 * ! the date rather than a substitute for it.
 * ! H-A/H-F: `~` is load-bearing, not decoration. `currentOdometer` only advances on a fuel
 * ! log, a maintenance log or the Settings panel, so between logs this card reports MORE
 * ! fuel than the bike has and the date sits too late. §B floors every figure to compensate;
 * ! an unhedged date here would be a measurement-shaped lie.
 * ! H-G: never a named weekday — the Dhaka weekend is Friday–Saturday and may be the
 * ! non-riding days, so a date landing there is not a day the tank drains.
 */
function headline(halfDate: Date | null, kmToHalf: number): string {
  // ! §E: with no km/day there is no honest date, so the distance is promoted to the
  // ! headline — same words as the sub-line it replaces, never an unhedged guess.
  if (!halfDate) return `~${kmToHalf.toLocaleString()} km to go`;
  return `Half tank ~ ${format(halfDate, "d MMM")}`;
}

/**
 * ! 55a: one line, two facts — when, and how far. `today`/`tomorrow` beat `in 0 days`.
 */
function subLine(daysToHalf: number, kmToHalf: number): string {
  const when =
    daysToHalf <= 0 ? "today" : daysToHalf === 1 ? "tomorrow" : `in ${daysToHalf} days`;
  return `${when} · ~${kmToHalf.toLocaleString()} km to go`;
}

/**
 * The half-tank date and the standing full-to-half range (spec 55, compacted by 55a).
 *
 * ! D7: deliberately NOT styled like `RemindersBanner` — this is a forecast, not an alert,
 * ! so it carries no tone colour, no icon badge and no status pill.
 * ! The audit lines below the headline are what make the headline checkable: if the date
 * ! looks wrong, that is where the rider sees why. 55a shrank them and merged the range
 * ! with its basis; it did not remove them, because an unauditable date is the failure
 * ! mode H-F guarantees this card will eventually hit.
 */
export function TankForecastCard({ bikeId }: TankForecastCardProps) {
  const forecast = useTankForecast(bikeId);

  // H-K / `unavailable`: a bike with no usable mileage figure gets no card at all, rather
  // than a card full of dashes.
  if (forecast?.state === "unavailable") return null;

  const { halfRangeKm, kmPerLiter, basis } = forecast;
  const rangeAndBasis = `${rangeSentence(halfRangeKm)} · ${basisLine(kmPerLiter, basis)}`;

  return (
    <Panel style={styles.card}>
      <Text style={styles.heading}>Tank forecast</Text>

      {forecast?.state === "range-only" ? (
        <>
          <Text style={styles.range}>{rangeSentence(halfRangeKm)}</Text>
          <Text style={styles.audit}>{basisLine(kmPerLiter, basis)}</Text>
          <Text style={styles.nudge}>
            Mark a fill-up as a full tank to get the date.
          </Text>
        </>
      ) : forecast?.pastHalf ? (
        <>
          <Text style={styles.headline}>Past half tank</Text>
          <View style={styles.auditBlock}>
            <Text style={styles.audit}>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </Text>
            <Text style={styles.audit}>{rangeAndBasis}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.headline}>
            {headline(forecast?.halfDate, forecast?.kmToHalf)}
          </Text>
          {/* ! Never state liters: `9.85 L` reads like a measurement, `~154 km to go` reads
              ! like what it is. The headline above already carries the hedge. */}
          {forecast?.daysToHalf != null && (
            <Text style={styles.sub}>
              {subLine(forecast?.daysToHalf, forecast?.kmToHalf)}
            </Text>
          )}
          <View style={styles.auditBlock}>
            <Text style={styles.audit}>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </Text>
            <Text style={styles.audit}>{rangeAndBasis}</Text>
          </View>
        </>
      )}

      {/* ! H-J: said once, and only here. `fuelTankCapacityLiters` is nominal, and a gauge
          ! needle at "half" is not half the fuel — so the card computes half the FUEL, which
          ! is the defensible quantity, and says so rather than modelling a gauge curve. */}
      <Text style={styles.footnote}>Half the fuel, not the gauge.</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 1,
  },
  heading: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  headline: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  sub: {
    fontSize: 11,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  range: {
    fontSize: 12.5,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
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
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 5,
  },
  footnote: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
