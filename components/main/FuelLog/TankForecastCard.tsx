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
 */
function rangeSentence(halfRangeKm: number): string {
  return `You can ride ~${halfRangeKm.toLocaleString()} km on half a tank`;
}

/**
 * ! D4: the basis is named, never implied. A 40 → 45 km/L swing moves the half-range by
 * ! 30 km, so an unlabelled figure is one the rider cannot audit.
 */
function basisLine(kmPerLiter: number, basis: "exact" | "approximate"): string {
  const label = basis === "exact" ? "exact" : "estimated";
  return `Based on ${kmPerLiter.toFixed(1)} km/L (${label})`;
}

/**
 * ! H-A/H-F: the hedge is load-bearing, not decoration. `currentOdometer` only advances on a
 * ! fuel log, a maintenance log or the Settings panel, so between logs this card reports MORE
 * ! fuel than the bike has and the date sits too late. §B floors every figure to compensate;
 * ! an unhedged date here would be a measurement-shaped lie.
 * ! H-G: never a named weekend — the Dhaka weekend is Friday–Saturday and may be the
 * ! non-riding days, so a date landing there is not a day the tank drains.
 */
function headline(daysToHalf: number | null, halfDate: Date | null, kmToHalf: number): string {
  // ! §E: with no km/day there is no honest date, so the distance is promoted to the
  // ! headline — same words as the sub-line it replaces, never an unhedged guess.
  if (daysToHalf == null || !halfDate) return `~${kmToHalf.toLocaleString()} km to go`;
  if (daysToHalf <= 0) return "Half tank any time now";
  if (daysToHalf === 1) return "Half tank around tomorrow";
  if (daysToHalf < 7) return `Half tank in about ${daysToHalf} days`;
  return `Half tank around ${format(halfDate, "d MMM")}`;
}

/**
 * The half-tank date and the standing full-to-half range (spec 55).
 *
 * ! D7: deliberately NOT styled like `RemindersBanner` — this is a forecast, not an alert,
 * ! so it carries no tone colour, no icon badge and no status pill.
 * ! The audit lines below the headline are what make the headline checkable: if the date
 * ! looks wrong, that is where the rider sees why.
 */
export function TankForecastCard({ bikeId }: TankForecastCardProps) {
  const forecast = useTankForecast(bikeId);

  // H-K / `unavailable`: a bike with no usable mileage figure gets no card at all, rather
  // than a card full of dashes.
  if (forecast?.state === "unavailable") return null;

  const { halfRangeKm, kmPerLiter, basis } = forecast;

  return (
    <Panel style={styles.card}>
      <Text style={styles.heading}>Tank forecast</Text>

      {forecast?.state === "range-only" ? (
        <>
          <Text style={styles.range}>{rangeSentence(halfRangeKm)}</Text>
          <Text style={styles.audit}>{basisLine(kmPerLiter, basis)}</Text>
          <Text style={styles.nudge}>
            Mark your next fill-up as a full tank to get the date.
          </Text>
        </>
      ) : forecast?.pastHalf ? (
        <>
          <Text style={styles.headline}>Past half tank</Text>
          <View style={styles.auditBlock}>
            <Text style={styles.audit}>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since your{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </Text>
            <Text style={styles.audit}>{rangeSentence(halfRangeKm)}</Text>
            <Text style={styles.audit}>{basisLine(kmPerLiter, basis)}</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.headline}>
            {headline(forecast?.daysToHalf, forecast?.halfDate, forecast?.kmToHalf)}
          </Text>
          {/* ! Never state liters: `9.85 L` reads like a measurement, `~154 km to go` reads
              ! like what it is. The date line above already carries the hedge. */}
          {forecast?.daysToHalf != null && (
            <Text style={styles.sub}>
              ~{forecast?.kmToHalf?.toLocaleString()} km to go
            </Text>
          )}
          <View style={styles.auditBlock}>
            <Text style={styles.audit}>
              {forecast?.riddenSinceAnchorKm?.toLocaleString()} km since your{" "}
              {format(new Date(forecast?.anchorDate), "d MMM")} full tank
            </Text>
            {/* ! §E: the range and its basis are two lines, not one — combined they run to
                ! ~54 characters, which does not fit a 12px line at 360dp, and the half that
                ! would ellipsise is the basis. */}
            <Text style={styles.audit}>{rangeSentence(halfRangeKm)}</Text>
            <Text style={styles.audit}>{basisLine(kmPerLiter, basis)}</Text>
          </View>
        </>
      )}

      {/* ! H-J: said once, and only here. `fuelTankCapacityLiters` is nominal, and a gauge
          ! needle at "half" is not half the fuel — so the card computes half the FUEL, which
          ! is the defensible quantity, and says so rather than modelling a gauge curve. */}
      <Text style={styles.footnote}>Half the fuel, not half the gauge.</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  heading: {
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  headline: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  sub: {
    fontSize: 12.5,
    color: COLORS.textLight,
    fontVariant: ["tabular-nums"],
  },
  range: {
    fontSize: 13.5,
    color: COLORS.text,
    fontVariant: ["tabular-nums"],
  },
  auditBlock: {
    marginTop: 8,
    gap: 1,
  },
  audit: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontVariant: ["tabular-nums"],
  },
  nudge: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  footnote: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
