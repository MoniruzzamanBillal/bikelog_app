import { format, parse } from "date-fns";

// ! backend "date-only" fields (purchaseDate, fuelLog.date, serviceDate, dateReported,
// ! periodEndDate, expiryDate, etc.) serialize as full ISO instants at UTC midnight
// ! (e.g. "2026-08-17T00:00:00.000Z"). `new Date(thatString)` + date-fns's format()/
// ! getDate() etc. read *local* time, so on any timezone behind UTC the displayed date
// ! silently shifts back one day. Stripping the time portion and re-parsing as a plain
// ! local calendar date avoids the UTC-instant round-trip entirely.
export function parseApiDate(dateString: string): Date {
  return parse(dateString.split("T")[0], "yyyy-MM-dd", new Date());
}

export function formatApiDate(dateString: string, pattern: string): string {
  return format(parseApiDate(dateString), pattern);
}
