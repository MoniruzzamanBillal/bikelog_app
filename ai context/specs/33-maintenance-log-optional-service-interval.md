# 33: Make Maintenance Log's Service Interval (km) Optional

Status: ✅ Complete (client-side change is code-complete and bundle-verified; end-to-end runtime behavior needs backend spec 28 to ship — see Verify)

## Goal

Per direct user request: "Service Interval (km)" (`intervalKmUsed`) is currently a required field on the Add/Edit Maintenance form. The user wants it optional, matching the paired backend change in `bikelog_server`'s spec `28-maintenance-log-optional-service-interval.md` (**depends on that spec landing first** — this client currently assumes every maintenance log response always has `intervalKmUsed`/`nextDueOdometer`, and will crash on `undefined` if the server starts omitting them before this spec's guards are in place).

## Context

- `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx`'s `handleSubmit` currently hard-fails the submit with a toast if `intervalKmUsed` is blank or fails `DECIMAL_REGEX` (`maintenanceLog.validation.ts` line 133-136 area). This needs to become optional-if-blank, matching how `serviceCenter`/`partsReplaced`/`notes` are already handled in the same function (`.trim() || undefined`).
- Edit-mode prefill (`useEffect` at line 88-122) does `setIntervalKmUsed(log.intervalKmUsed.toString())` unconditionally — this will throw (`Cannot read properties of undefined`) the moment a log with no `intervalKmUsed` is opened for editing, once the backend can actually return one. Needs `log.intervalKmUsed?.toString() ?? ""`.
- `MaintenanceLogCard.tsx` renders two lines unconditionally that assume both fields exist:
  - `Interval: {log.intervalKmUsed.toLocaleString()} km` (inside `detailRow`, alongside `Cost`)
  - `Next due: {log.nextDueOdometer.toLocaleString()} km`

  Both will throw on `undefined.toLocaleString()` once the backend can omit these fields. Since (per backend spec 28's design) `nextDueOdometer` is only ever computed when `intervalKmUsed` is present, the two are always both-present or both-absent for a given log — they can share one guard.

- `RemindersBanner.tsx` reads `reminder.kmRemaining` unconditionally to build its headline text (`Due in ${reminder.kmRemaining...} km` / `Overdue by ${Math.abs(reminder.kmRemaining)...} km`), and only guards the _secondary_ days line (`daysRemaining !== undefined`). Per backend spec 28, a reminder for an interval-less log will have `kmRemaining: undefined` and rely purely on `nextDueDate`/`daysRemaining`. Today's code has no fallback for that case — it would render `"Due in undefined km"`.
- `types/maintenance-log.types.ts` types every one of these fields as required `number`, so a mechanical "flip to optional" won't even type-check against the backend response shape once spec 28 ships — this has to change here too.
- Nothing else in the app reads `intervalKmUsed`/`nextDueOdometer`/`kmRemaining` (confirmed via repo-wide search) — the surface is exactly `MaintenanceLogFormModal.tsx`, `MaintenanceLogCard.tsx`, `RemindersBanner.tsx`, and the type file.
- **Out of scope**: `bikelog_client-web-` has the identical field and the identical required-field UX (`components/(main)/MaintenanceLog/`) but the user's instruction was specifically "frontend and backend" in the context of this app (`bikelog_app`) — per this repo's cross-project rule, the web client isn't touched here; if the user wants parity there too, that's a separate follow-up and should be logged in `bikelog_client-web-/context/progress-tracker.md` Known Gaps if not picked up.

## Design

### `types/maintenance-log.types.ts`

```ts
export type TMaintenanceLog = {
  ...
  intervalKmUsed?: number;      // was: number
  nextDueOdometer?: number;     // was: number
  ...
};

export type TCreateMaintenanceLogPayload = {
  ...
  intervalKmUsed?: number;      // was: number
  ...
};

export type TUpdateMaintenanceLogPayload = {
  // already optional — no change
};

export type TReminder = {
  ...
  nextDueOdometer?: number;     // was: number
  kmRemaining?: number;         // was: number
  ...
};
```

### `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx`

**`handleSubmit`** — change the current hard-required check:

```ts
if (!intervalKmUsed.trim() || !DECIMAL_REGEX.test(intervalKmUsed.trim())) {
  Toast.show({
    type: "error",
    text1: "Enter a valid service interval",
    position: "top",
  });
  return;
}
```

to an optional-if-blank check, matching the file's own existing pattern for `serviceCenter`:

```ts
if (intervalKmUsed.trim() && !DECIMAL_REGEX.test(intervalKmUsed.trim())) {
  Toast.show({
    type: "error",
    text1: "Enter a valid service interval",
    position: "top",
  });
  return;
}
```

**Payload build** — change:

```ts
intervalKmUsed: parseFloat(intervalKmUsed),
```

to:

```ts
intervalKmUsed: intervalKmUsed.trim() ? parseFloat(intervalKmUsed.trim()) : undefined,
```

**Edit-mode prefill** (the `if (log)` branch inside the `useEffect`) — change:

```ts
setIntervalKmUsed(log.intervalKmUsed.toString());
```

to:

```ts
setIntervalKmUsed(log.intervalKmUsed?.toString() ?? "");
```

**Field label/placeholder** — change `"Service Interval (km)"` to `"Service Interval (km) (optional)"`, matching this same form's existing convention for `Service Center`/`Parts Replaced`/`Notes`/`Next Due Date`.

### `components/main/MaintenanceLog/MaintenanceLogCard.tsx`

Wrap the interval + next-due lines in one guard (both are always present-or-absent together per backend spec 28's design):

```tsx
{
  log.intervalKmUsed !== undefined && (
    <>
      <View style={styles.detailRow}>
        <Text style={styles.detail}>Cost: ৳{log.cost.toLocaleString()}</Text>
        <Text style={styles.detail}>
          Interval: {log.intervalKmUsed.toLocaleString()} km
        </Text>
      </View>
      <Text style={styles.detail}>
        Next due: {log.nextDueOdometer!.toLocaleString()} km
      </Text>
    </>
  );
}
{
  log.intervalKmUsed === undefined && (
    <Text style={styles.detail}>Cost: ৳{log.cost.toLocaleString()}</Text>
  );
}
```

(`Cost` has to be duplicated across both branches since it's unconditional but currently only exists inside the same `detailRow` as `Interval` — simplest to just render it in both branches rather than restructure the row layout. An equally valid alternative: always render `Cost` on its own line above, and only wrap `Interval`/`Next due` in the guard — slightly bigger diff since it reflows the existing `detailRow` grouping. Pick whichever the user prefers when this is implemented; leaning toward the smaller diff (first version) by default.)

### `components/main/MaintenanceLog/RemindersBanner.tsx`

The headline `reminderText` currently assumes `kmRemaining` always exists. Branch on whether this reminder has km data at all:

```tsx
<Text style={styles.reminderText}>
  {reminder.kmRemaining !== undefined
    ? isOverdue
      ? `Overdue by ${Math.abs(reminder.kmRemaining).toLocaleString()} km`
      : `Due in ${reminder.kmRemaining.toLocaleString()} km`
    : reminder.daysRemaining !== undefined
      ? isOverdue
        ? `Overdue by ${Math.abs(reminder.daysRemaining)} days`
        : `Due in ${reminder.daysRemaining} days`
      : isOverdue
        ? "Overdue"
        : "Upcoming"}
</Text>
```

The existing secondary `daysRemaining` line right below stays as-is **but** should now be skipped when the headline already consumed `daysRemaining` (the date-only branch above), to avoid printing the same "N days" info twice:

```tsx
{
  reminder.kmRemaining !== undefined &&
    reminder.daysRemaining !== undefined && (
      <Text style={styles.reminderSubtext}>
        {isOverdue
          ? `${Math.abs(reminder.daysRemaining)} days overdue`
          : `${reminder.daysRemaining} days remaining`}
      </Text>
    );
}
```

**Open question for the user**: this headline copy ("Overdue by N days" / "Due in N days" / bare "Overdue"/"Upcoming" as a last-resort fallback) is a judgment call, not something the user specified — flag it for review rather than treating it as final. The current file's copy tone ("Overdue by X km", "Due in X km") was the only pattern to extend from.

## Implementation

1. ✅ `types/maintenance-log.types.ts` — `intervalKmUsed?`, `nextDueOdometer?` on `TMaintenanceLog`; `intervalKmUsed?` on `TCreateMaintenanceLogPayload`; `nextDueOdometer?`, `kmRemaining?` on `TReminder`.
2. ✅ `components/main/MaintenanceLog/MaintenanceLogFormModal.tsx` — optional-if-blank validation, payload build, edit-mode prefill guard, "(optional)" label.
3. ✅ `components/main/MaintenanceLog/MaintenanceLogCard.tsx` — guard `Interval`/`Next due` display. Implemented as an if/else ternary rather than the two-separate-block form sketched in this spec's Design section — that sketch had a JSX syntax bug (a trailing `;` inside a `{...}` expression container, which isn't valid JSX/JS and would fail to compile); the ternary is semantically identical and compiles cleanly.
4. ✅ `components/main/MaintenanceLog/RemindersBanner.tsx` — km/date/bare-status fallback chain in the headline; skip the redundant days subtext when the headline already showed days. Same JSX-semicolon issue existed in this spec's Design sketch for the secondary line's guard; fixed the same way (no trailing semicolon inside the expression container).
5. ✅ `ai context/progress-tracker.md` — flipped this row Not Started → Complete.

## Dependencies

Depends on `bikelog_server` spec 28 (`intervalKmUsed`/`nextDueOdometer` becoming genuinely optional in API responses) landing first — this client's guards need to exist before the server can safely start omitting these fields, and there's no value in shipping this half against a server that still always returns both.

## Verify

- [ ] Add Maintenance with Service Interval left blank → submits successfully, no validation toast blocks it. **Not exercised live** — the deployed `bikelog_server` backend still has `intervalKmUsed` required as of this writing (backend spec 28 is a separate, not-yet-shipped change; per this repo's cross-project rule this app doesn't touch `bikelog_server`), so a real submit against the live API would still get a `400` from the server today. Code-verified: the client-side check (`intervalKmUsed.trim() && !DECIMAL_REGEX.test(...)`) no longer blocks an empty value, and the payload now sends `undefined` (omitted) rather than `NaN` when blank — confirmed via `npx tsc --noEmit`, `expo lint`, and a full `expo export --platform web` bundle of every route including `/bikes/[bikeId]/maintenance-logs`, all clean.
- [x] Add Maintenance with a non-numeric Service Interval (e.g. "abc") → still blocked with "Enter a valid service interval" (format validation intact, only the required-ness changed) — code-verified: `intervalKmUsed.trim()` is truthy for `"abc"`, so `!DECIMAL_REGEX.test(...)` still trips the same toast as before.
- [x] Maintenance log card for an interval-less log → shows Cost, no "Interval:"/"Next due:" lines, no crash — code-verified via the `log.intervalKmUsed !== undefined` ternary; not yet exercised against a real interval-less log since none exist until backend spec 28 ships.
- [x] Maintenance log card for a normal (interval-present) log → unchanged from current behavior — the ternary's truthy branch renders byte-identical markup to the prior unconditional version.
- [x] Edit an interval-less log → Service Interval field opens blank (not "undefined"), can be left blank or filled in and saved — code-verified via `log.intervalKmUsed?.toString() ?? ""`; same caveat as above, no real interval-less log exists yet to open.
- [x] Reminders banner with a mix of km-based and date-only reminders → date-only ones show a days-based headline instead of "Due in undefined km"; km-based ones unchanged from current behavior; no duplicate days line for km-based reminders that also have a `nextDueDate` — code-verified via the fallback chain and the `kmRemaining !== undefined && daysRemaining !== undefined` guard on the secondary line; no real date-only reminder exists yet to exercise live, same reason as above.
- [x] `npx tsc --noEmit` clean — confirmed, exit code 0.
- [x] `expo lint` clean — confirmed, exit code 0.
- [x] Repo-wide grep for `intervalKmUsed`/`nextDueOdometer`/`kmRemaining` confirms the only call sites are the four files this spec touches — no missed usage elsewhere.
- [x] `expo export --platform web` — full Metro bundle of all 17 routes succeeds with no errors, exercising the actual JSX transform on the changed files (stronger signal than `tsc` alone, which caught the type-level shape but not necessarily every JSX-syntax edge case).

**Known gap, not fixable in this unit**: end-to-end runtime verification (blank-submit actually succeeding, an interval-less card/reminder actually rendering) is blocked on `bikelog_server` spec 28 shipping first — until then, this client silently tolerates the old required-everywhere backend just fine (no regression), but its new optional-handling paths have no real data to exercise them against. Logged in `progress-tracker.md`'s Known Gaps.
