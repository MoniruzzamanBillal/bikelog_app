# AI Workflow Rules

## Overall Approach

This app's job is to reach feature-parity with an already-shipped, already-verified web app (`bikelog_client(web)`) — the product decisions (what fields exist, what the backend allows, what a screen needs to show) are **not open questions**, they're already answered and verified live against `bikelog_server`. What *is* open is how each screen looks and feels in React Native, following `expenseTrackerReactNative`'s established conventions (see `architecture.md`). When in doubt between inventing a new RN pattern and matching what the reference project already does, match the reference project. When in doubt about a field, endpoint, or business rule, check the web app's already-verified implementation and specs (`../../bikelog_client(web)/context/specs/`) before re-deriving it from the backend source.

## Scoping Rules

1. Build one spec at a time, fully, before starting the next — same discipline both sibling projects already used. (Specs for this app aren't written yet — this context set is preparation, not the spec-by-spec plan itself. Write `context/specs/00-build-plan.md` onward following the same numbered convention when implementation actually starts, using `../PLAN.md` §6's screen list as the spec breakdown.)
2. A screen is "done" when: it works end-to-end against the real `bikelog_server` API, `expo lint` is clean, and it's been manually run on-device (or in a simulator).
3. Don't add fields, screens, or interactions neither the backend nor the already-shipped web app has. If the web app didn't build it, this app doesn't either, for v1.
4. Don't introduce a new dependency (charting, animation, state-management, date-picker, etc.) without checking `architecture.md`'s Invariants and `../PLAN.md` §2's stack table first — between the reference project's existing dependencies and what's already proven on the web side, almost everything needed is already justified.

## Splitting Work

- Split by backend module, matching the numbered specs once they exist — same reasoning as both sibling projects: a domain's list view and its create/edit modal share types and are faster built together than split across sessions.
- The one cross-cutting piece worth building before the first domain spec (not deferred into whichever spec happens to need it first): the shared components in `components/main/shared/` (`StatusBadge`, `ConfirmDelete`, `EmptyState`, `SectionLoading`) and the `Picker`-vs-`Menu` decision for multi-option selects (`architecture.md`'s "Reused vs. adapted", `code-standards.md`'s Forms section) — every domain needs at least one of these, so resolving them once up front avoids re-deciding per screen.

## Handling Missing Requirements

- If a screen's exact field list is unclear: check `bikelog_server/postman/dummy-data.md` first (authoritative required/optional/forbidden fields, cross-checked against real `.validation.ts` files), then the equivalent already-shipped web screen's source (`bikelog_client(web)/components/(main)/<Domain>/`) as a second, already-verified reference — don't guess a field name when two independent sources of truth already exist.
- If a component's prop API is unclear (Paper, `expo-router`, `react-native-keyboard-controller`, etc.): read the reference project's actual usage (`expenseTrackerReactNative`) first, since it's a proven, working call site; fall back to the library's own docs only if the reference project never uses that particular prop/component.
- If a UX decision isn't specified by the web app or the reference project (e.g. exact swipe-action icon, exact card layout): make the minimal, obviously-correct choice and move on — same stance as the web app's own rule. Only stop and ask if the ambiguity is about *data correctness* (e.g. which date field to bucket by — already answered by the backend contract, so this should rarely actually come up) or a genuinely new structural decision with no precedent in either sibling project (e.g. the `Picker`-vs-`Menu` choice, or the tab-vs-header-icon question for Settings).

## Protected Files

- `context/user.context.tsx` and `utils/AuthGuard.tsx`, once built, should stay close to `expenseTrackerReactNative`'s versions — don't "upgrade" them toward a heavier auth library or a `GET /auth/me` round-trip. `bikelog_server` has no refresh-token flow to build against, same constraint the web app documented.
- `utils/axiosInstance.ts`'s error interceptor **should** diverge from the reference project's version — this is the one deliberate, intentional fix (see `architecture.md`'s "Reused vs. adapted"), not something to leave as-is out of over-eager consistency with the reference project. Everything else in that file should match the reference project's shape.
- `components/main/shared/*` — treat as a shared library. A fix here should be generically correct across every domain that uses it, not special-cased for one screen.
- Don't touch `bikelog_server/` or `bikelog_client(web)/` from this app's work — both are separate, complete, separately-tracked codebases. If building this app reveals a genuine backend gap or a web-app bug that also affects this app's plan, note it in `progress-tracker.md`'s "Known Gaps" and flag it to the user rather than editing either sibling project directly.

## Documentation Sync

- After finishing a spec (once specs exist): update its own status line, the build-plan index, and add a `progress-tracker.md` Recent Activity entry — same discipline as both sibling projects.
- If implementation reveals that this context set (particularly `architecture.md`'s claims about the reference project, or `../PLAN.md` itself) was wrong or incomplete about something, fix that doc in the same pass. `bikelog_client(web)/CLAUDE.md` already documents one case of this exact drift going unfixed for a while (`architecture.md`/`code-standards.md` describing a hook-wrapper layer the real code dropped) — don't repeat it a third time across three sibling projects.

## Verification Checklist Before Moving On

- [ ] Screen works against the real API (not mocked data) — verify against `bikelog_server/postman/dummy-data.md`'s seeded values or by exercising the flow directly.
- [ ] `expo lint` clean.
- [ ] Manually run on-device or in a simulator — pull-to-refresh, swipe actions, and modal open/close all checked, not just code-reviewed (this app has an actual runnable target, unlike the web app's `curl`-only verification environment during its own build).
- [ ] No server-derived field sent in any mutation payload.
- [ ] Screen is unreachable without a session (log out, confirm redirect to `/auth`).
- [ ] Matches the already-shipped web screen's field set and business rules (cross-check against `bikelog_client(web)/context/specs/<matching-spec>.md` if one exists for that domain).
