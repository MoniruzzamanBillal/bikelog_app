# 58: The email stays read-only in Settings

Status: ✅ **Implemented 2026-10-19.** Verified to the static floor only: `npx tsc --noEmit` clean, `yarn lint`
clean. One file, no new type, no new request, no new dependency.

Requested directly by the developer (2026-10-19): *"my requirement is user cant update their own email. it
should be blocked from frontend and backend."*

**This spec replaces an earlier draft of itself that did the opposite, and that is worth recording.** The
first version made the field editable — a real input, a confirm dialog, name + email in one `PATCH` — written
from *"in setting page, only user name and user photo can be updated. user email can not be updated fix
this."* read as "make it editable". The developer's clarification was the reverse. The editable version was
reverted in the same session (`git checkout` of `ProfilePanel.tsx`) and never left the working tree. The
lesson: *"X can not be done, fix this"* is genuinely ambiguous between "make X possible" and "make sure X
stays impossible", and for a field that is also a credential the second reading is the safe one — **ask
instead of picking**.

Scope: `components/main/SettingsCatalog/ProfilePanel.tsx` only. Companion:
`bikelog_server/context/specs/55-profile-email-update.md` (the backend refusal).

---

## §0 Hazards

**H-A — a field that does nothing when tapped reads as a bug, not as a rule.** Spec 56 already rendered the
email as `editable={false}`, which is the *block*, but a disabled `FormField` looks almost identical to an
editable one in the Nocturne palette: same box, same border, same text colour. A rider tapping it and getting
no keyboard will reasonably conclude the screen is broken. So the block needs to be **legible before the
tap** — hence the padlock and the dimming.

**H-B — the frontend is not the enforcement.** `editable={false}` is a prop; anyone with the token can call
the API directly. The server refuses a submitted `email` with a 400 and its service writes `data: { name }`
only (`bikelog_server` spec 55 D1/D3). This half is the honest *explanation*, not the lock.

**H-C — do not drop the field from the editor.** "Your address, and it is fixed" is information the rider
wants *while* editing their profile; removing it would make the one question it answers ("which account am I
signed in as?") require leaving the editor.

---

## §A Design decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | Keep the disabled `FormField`, add a **padlock** in its `rightElement` | H-A. `FormField` already has the slot (the maintenance form uses it for units), so this is one prop, no new component. A padlock is the one universally-read "you may look, not type" affordance |
| D2 | Dim the whole field with `opacity: 0.72` rather than re-colouring it | It dims the label, the box and the value together, and cannot drift from `fieldStyles`' tokens the way a hand-picked colour would. The Nocturne coupling in `../../CLAUDE.md` is about token *values*; this adds none |
| D3 | The note becomes **"Your email is your sign-in ID and can't be changed."** | It was *"Email can't be changed from the app yet."* — and "yet" was a promise this project is not going to keep (there is no mail sender, so no verification loop; server spec 55 D5). The new line also answers *why*, which is the only thing that stops the rider asking again |
| D4 | The Save button stays **"Save name"** and keeps saving the name alone | Nothing about the save path changes. The editable draft's `handleSave`/`submit` split, the confirm dialog and the changed-tests are all gone |
| D5 | No toast, no inline error for the server's 400 | A correct build can never produce it — the field cannot be typed into. If it ever appears, `axiosInstance`'s interceptor already toasts the server's message, which names the reason |

---

## §B What the panel looks like

- Collapsed row: unchanged — avatar, name, email, Edit.
- Expanded editor: photo block → **Name** (editable) → **Email** (dimmed, padlock, not editable) →
  *"Your email is your sign-in ID and can't be changed."* → **Save name**.

---

## §C Verify

| # | Check | State |
| --- | --- | --- |
| V1 | Tapping the email field opens no keyboard and changes nothing | ⬜ device |
| V2 | The padlock and the dimming make it read as locked **before** tapping (H-A) | ⬜ device |
| V3 | The name still saves on its own, with its existing toast | ⬜ device |
| V4 | The note reads as a rule, not as "not yet" | ⬜ device |
| V5 | 360dp: the padlock does not collide with the value, and the note does not wrap to three lines | ⬜ device |
| V6 | Backstop, not a UI check: a hand-rolled `PATCH /auth/update-profile` with an `email` key answers **400** (server spec 55 V7) | ⬜ Postman |
| V7 | `npx tsc --noEmit` and `yarn lint` clean | ✅ |
