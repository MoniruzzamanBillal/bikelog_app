# 56 — Settings: update your name and your profile photo

**Status**: ✅ Code complete — implemented 2026-10-18. All 6 steps done; `npx tsc --noEmit` and `yarn lint` both
clean (0 problems). **Nothing has been run** — no device, no simulator, and the backend half is not deployed, so
every call this panel makes would 404 today. V1 is the only Verify item that has passed; V2–V20 are all owed,
V13 above all (see H-B).
**Depends on `bikelog_server/context/specs/53-user-profile-update-and-avatar.md`** — build, migrate and
deploy that first. Nothing here works before it: `users` has no picture column today and there is no route
that can write `name`, so every call this spec makes would 404.
**Scope**: `bikelog_app/` — one new shared component (`UserAvatar`), one new Settings panel
(`ProfilePanel`), small edits to `SettingsCatalog.tsx`, `components/main/shared/index.ts`,
`types/global.types.ts`, and optionally `app.json`'s permission strings.
**Style reference**: the developer's `expenseTracker2` client — `client/components/main/Settings/SettingsPage.tsx`
and `client/components/main/shared/UserAvatar.tsx` (its specs `46-user-profile-picture.md` and server
`20-user-profile-picture-upload.md`). Its *look* is what is being adopted here: a round avatar with an
initials fallback, a small camera badge, and inline `Change photo` / `Remove photo` text buttons. Its
*container* is not — see D3.

---

## Request

> now in my project app project, in setting page, i should have functionality for updating user. user can
> update user name and upload and edit user image.
>
> For the reference, see this project's implementation in app how i'm updating user name and user image. i
> want this project's frontend style.

---

## Goal

In Settings, show who is signed in — photo (or initials), name and email — and let the rider change their
name and add, replace or remove their profile photo, without leaving the screen.

---

## Design

Every colour, radius and size comes from `utils/colors.ts` (`COLORS`, `tint`) and the existing panel
metrics; icons are `MaterialCommunityIcons`, as everywhere else in this app. No new visual language — the
avatar's tinted circle is the same chip family as `PanelIcon` and `EmptyState`'s accent circle.

### Today's state (what this changes)

- Settings is `SettingsCatalog.tsx`: `ScreenHeader` + a `ScrollView` of `Panel`s — Odometer, Maintenance
  types, Engine oil types, Admin (conditional), Account.
- The **Account** panel is the whole of the current identity UI: an `account-circle-outline` `PanelIcon`,
  the title "Account", `user?.email` as its subtitle, and a destructive **Log out** button. There is no
  name anywhere and nothing is editable.
- `context/user.context.tsx` builds its stored user from the **login token's claims** —
  `handleSetUser({ _id: decoded.userId, email: decoded.userEmail })` in `LoginForm.tsx`. **So the app has
  never known the rider's name**, even though `IUser.name` has always been declared. That is the single most
  important fact in this design: the name has to come from `GET /auth/me`.
- `IUser.profilePicture?: string` is declared in `types/global.types.ts` and **read by nothing** (one
  grep hit, the declaration itself). It is dead and its type is wrong for this app's conventions.

### D1 — one shared `UserAvatar`

`components/main/shared/UserAvatar.tsx`, exported from `shared/index.ts`:

```tsx
type UserAvatarProps = {
  name?: string | null;
  image?: TCloudinaryImage | null;
  /** Diameter: 56 in the panel header, 88 in the editor. */
  size: number;
  style?: StyleProp<ViewStyle>;
};
```

- Photo present → `expo-image` `<Image source={{ uri: image.url }} contentFit="cover"
  cachePolicy="memory-disk" />` filling a circle (`borderRadius: size / 2`, `overflow: "hidden"`).
- No photo → a `tint(COLORS.primary, 0.14)` circle with a `tint(COLORS.primary, 0.32)` hairline border and
  the initials in `COLORS.accentForeground` — the same recipe `PanelIcon` uses, so the empty avatar reads as
  part of the Nocturne family rather than as a new thing.
- **Falls back to initials if the image fails to load** (`onError` → local `failed` state), and resets
  `failed` whenever `image.url` changes. This matters offline: the URL is in the fetched/persisted user but
  the bitmap may not be cached, and a blank circle is worse than initials.
- Font size scales with the circle: `size >= 80 ? 28 : 18`, weight `"500"`, matching the panel-title weight.
- Export `initials(name)` from the same file: first letters of the first two whitespace-separated words,
  uppercased, `"?"` when there is no name. Keep it exported so the panel never grows a private copy — the
  reference project ended up with two and had to delete both.
- `accessibilityLabel` = the name.

It takes `TCloudinaryImage` (`{ url, publicId }`), not a bare URL string, because that is what every image
in this app is (`ImagePickerField`, `ImageViewerModal`, `bike-accessory.types.ts`) and what server spec 53
returns.

### D2 — `ImagePickerField` is deliberately **not** reused

It is the obvious candidate and it is the wrong shape: a 64 pt **square** tile with corner pencil/close
badges whose offsets are hand-tuned literals (`bottom: 58`, `top: -74`), and tapping it opens
`ImageViewerModal`. An avatar is a circle with an initials state and two labelled text buttons, and nobody
wants a full-screen viewer for their own 512 px avatar. Bending `ImagePickerField` into both shapes would
put a `variant` prop through a component five domains already depend on — and `shared/*` is a shared
library where a fix has to be generically correct (`ai-workflow-rules.md`, Protected Files). **Do not touch
`ImagePickerField.tsx` in this spec.** What *is* reused is its proven *logic*: the permission-then-launch
pair, the `assetToFile` shape, the `Alert.alert` source chooser (D5) and the spinner overlay.

### D3 — a new `ProfilePanel`, with an inline editor (the one deviation from the reference)

`components/main/SettingsCatalog/ProfilePanel.tsx`, rendered as the **first** panel in `SettingsCatalog`'s
`ScrollView`, above `OdometerPanel`: identity belongs at the top of Settings, which is also where the
reference project puts it.

The reference opens its editor in a bottom `Sheet`. **This app has no `Sheet` component**, and Settings
already has an established editor idiom used by both catalog panels: a header button that toggles an inline
block open (`expandMaint`/`expandOil`, `PrimaryButton` with `icon="plus"` → `icon="close"`,
`variant="primary"` → `"secondary"`). Adding a bottom sheet here would introduce a new interaction pattern
to the one screen that already has a consistent one. So: **inline expansion, same as its neighbours.** The
reference's *style* — round avatar, camera badge, inline text buttons, immediate upload — is kept in full.

**Collapsed** (the default):

```
┌─────────────────────────────────────────────┐
│ (avatar 56)  Moniruzzaman Billal   [ Edit ] │
│   📷ᵒ        atiuiux02@gmail.com            │
└─────────────────────────────────────────────┘
```

- The avatar carries a small decorative camera badge (bottom-right, `camera` glyph, `COLORS.primary` on a
  `COLORS.card` disc with a `COLORS.border` ring) as the affordance that a photo can be set. It is
  **decorative only, not its own touch target** — nesting a second touchable inside a row that already has
  one is what causes dead taps, and the reference's spec says the same.
- Name in the `panelTitle` style; email in `accountEmail`. Both `numberOfLines={1}`.
- `Edit` is the house header `PrimaryButton ... compact`, toggling to `Close` exactly like `Add`/`Close` on
  the catalog panels.
- No `PanelIcon` here: the avatar *is* the panel's icon.

**Expanded** — the collapsed row stays put (so the toggle never moves under the finger) and this block
appears beneath it:

```
            (avatar 88, spinner overlay while busy)
       📷 Change photo        🗑 Remove photo
  Name *  [ Moniruzzaman Billal                  ]
  Email   [ atiuiux02@gmail.com        ] (disabled)
  Email can't be changed from the app yet.
  [            Save name            ]
```

- `Change photo` reads `Add photo` when there is none; `Remove photo` renders only when there is one.
  Both are bare icon+label rows (`COLORS.primary` and `COLORS.danger`), not buttons — the panel already has
  one full-width `PrimaryButton` and a second would compete with Save.
- While an upload or a remove is in flight: an `ActivityIndicator` over a `rgba`-dimmed avatar (reuse
  `ImagePickerField`'s overlay recipe) and both photo buttons disabled. Save stays enabled — the two
  mutations are independent (D4).
- `FormField label="Name" required` and a disabled `FormField label="Email"`, then the same caption line
  the reference uses, in `COLORS.textMuted` at 11.5.
- Save is disabled when the name is empty or unchanged, and shows `loading` while pending.

### D4 — the photo saves itself; **Save** means the name only

Picking an image uploads it immediately, exactly like every other image in this app
(`BikeAccessoryCard.handleImageUpload`) and like the reference. Reasons, in order: there is no half-saved
state where the name committed and the photo did not; there is no "unsaved photo" to lose when the panel
collapses; and it matches the two mutations the server actually exposes. Save posts `{ name }` and nothing
else.

### D5 — choosing a source

`Alert.alert("Profile photo", undefined, [Take Photo, Choose from Library, Cancel])` — a verbatim copy of
`ImagePickerField.openActionSheet`. The reference project avoided `Alert` because it ships a web target
where `Alert.alert` no-ops; this app's target is a real Android device and `Alert` is already its only
action-sheet idiom across five domains. Consistency wins. (If a web pass ever matters here, it is one
`Platform.OS === "web"` branch, and it is a separate spec for *all* the pickers, not a special case in this
one.)

Permissions are requested per source (`requestCameraPermissionsAsync` / `requestMediaLibraryPermissionsAsync`)
with `ImagePickerField`'s exact toast copy on denial.

### D6 — picker options: `allowsEditing: true, aspect: [1, 1]`

New for this app — every existing picker passes `allowsEditing: false` — and justified: the result is
displayed in a circle, so letting the rider frame their own face beats the server's `gravity: "face"` guess
(which is a fallback, not a crop UI). `quality: 0.7`, matching the other pickers, and `mediaTypes: ["images"]`.

**No client-side resize**, which is the other place this diverges from the reference: it ships a
`prepareAvatarImage` util built on `expo-image-manipulator`, and that package is **not installed here**.
Adding it means a new native module and therefore a fresh EAS build before anything can be tested — and
this app already has 12 unbuilt commits waiting. Server spec 53 normalises to 512×512 at upload instead
(its D6), which is where the sizing belongs anyway since the web client would need the same thing. The cost
is a larger request body: a square crop at `quality: 0.7` is typically ~1–2.5 MB against the server's 4 MB
cap, so a very large source photo can be refused with a clean 400. That is the accepted trade, and V12
measures it.

### D7 — where the data comes from

```tsx
const { data: profile } = useFetchData<IUser>(["profile"], "/auth/me");
const updateName    = usePatch([["profile"]]);
const uploadPhoto   = usePut([["profile"]]);
const removePhoto   = useDelete([["profile"]]);

const displayName  = profile?.data?.name ?? user?.name ?? "";
const displayEmail = profile?.data?.email ?? user?.email ?? "";
const photo        = profile?.data?.profilePicture ?? user?.profilePicture ?? null;
```

This is the app's **first** `GET /auth/me` call. `ai-workflow-rules.md`'s Protected Files rule says not to
upgrade `context/user.context.tsx` or `utils/AuthGuard.tsx` toward a `/auth/me` round-trip — that rule is
about the **auth path**: no blocking identity fetch between launch and first screen. A `useFetchData` inside
one Settings panel is an ordinary screen query on an ordinary `authCheck` route; it does not touch either
protected file and does not gate anything. **Neither file changes in this spec.**

After every successful mutation, also write through to the context:

```tsx
// ! One place that updates the context, so the persisted user and the ["profile"] query can
// ! never disagree. This is also what makes the panel render a name and photo on the next
// ! cold launch *before* /auth/me resolves — the login token carries neither (see H-A).
const applyUser = async (patch: Partial<IUser>) =>
  handleSetUser({ ...(user as IUser), ...patch });
```

`handleSetUser` persists to `AsyncStorage`, so this is also the offline story.

### D8 — the Account panel loses its email line

`ProfilePanel` now shows the email, so the Account panel keeps its icon, its title and **Log out** only.
Leaving `user?.email` in both would print the same address twice on one short screen. Nothing else about
that panel changes — the `confirm()` logout flow is untouched.

### D9 — types

`types/global.types.ts`:

```ts
export type IUser = {
  _id: string;
  name?: string;
  email: string;
  // ! Was `string` and read by nothing. Server spec 53 stores and returns { url, publicId },
  // ! the same TCloudinaryImage shape as every other image in this app; `null` is what the
  // ! server sends after a remove, and `undefined` is a session stored before this spec.
  profilePicture?: TCloudinaryImage | null;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};
```

Importing `TCloudinaryImage` from `@/types/image.types` into `global.types.ts` is a new cross-type import;
it is the right direction (`image.types.ts` imports nothing).

### States to design for

| State | Behaviour |
| --- | --- |
| `/auth/me` still loading, cold launch | Initials from the persisted name if there is one, else `"?"`; no skeleton — the panel is one row and a spinner there flickers |
| No photo | Tinted initials circle + camera badge |
| Uploading / removing | Spinner over the 88 pt avatar, both photo buttons disabled, no double-submit |
| Upload refused (400 too large / not an image) | The axios interceptor's error toast carries the server's message; avatar unchanged; spinner clears |
| Offline | The interceptor toasts; nothing is queued (Out of scope) |
| Permission denied | `ImagePickerField`'s exact toast copy, naming camera vs photo library |
| Image URL won't load | Initials fallback (D1) |
| Name empty / unchanged | Save disabled; a blank submit can't reach the server |

### Hazards

| # | Hazard | Handling |
| --- | --- | --- |
| H-A | **The stored context user has no `name`.** `LoginForm` writes `{ _id, email }` from the JWT claims, so before `/auth/me` lands the panel has an email and no name — and on a fresh login the avatar shows `"?"` for a moment | Accepted and designed for: initials fall back to `"?"`, and `applyUser` (D7) persists the name after the first save so it is there on the next launch. The alternative — minting `name` into the JWT — was rejected in server spec 53 D9 |
| H-B | **A 401 mid-upload.** Access tokens are 15 minutes (spec 51); the interceptor refreshes and replays the failed request. A replayed **multipart** body may be a consumed stream, in which case the retry sends an empty part and the upload fails for a reason the rider cannot act on | **This is the one unknown in the spec and V13 is written specifically to catch it.** Do not pre-emptively patch `utils/axiosInstance.ts` — it is a protected file and this would be the wrong place to discover a change to it. If V13 fails, record it as its own sub-spec (`56a`) with the finding, exactly as `51b`/`51c` were handled |
| H-C | **Cross-tenant leak of the `["profile"]` cache.** A stale `["profile"]` entry would show the previous rider's photo | Already handled: `handleSetTokens` calls `queryClient.clear()` on **login** and `logoutFunction` clears on logout (spec 48 §A). Verify, don't rebuild — V15 |
| H-D | **360 dp width.** The collapsed row is avatar 56 + two text lines + a compact `Edit` button. A long name plus a long email can overflow | `flex: 1, minWidth: 0` on the text column (the house fix, as in `panelTitleCol`) and `numberOfLines={1}` on both lines. V9 checks it with a long name at 360 dp |
| H-E | **A replaced photo showing the old bitmap**, since `cachePolicy="memory-disk"` caches by URL | Not a real risk: Cloudinary's `public_id` is randomised per upload (`upload.ts`'s scheme), so a replacement is always a new URL. Worth knowing before anyone "fixes" it with a cache-busting query string, which would defeat the cache for no reason |
| H-F | **Two sources of truth for the photo** — the `["profile"]` query and the persisted context user — can disagree for the moment between a mutation's success and its refetch | Prefer the query (`profile?.data ?? user`), and call `applyUser` in the same tick as the success toast. The reference project hit the inverse ordering and had to prefer its context copy; the difference is that its Home header reads the context while nothing here does, so the query is the fresher of the two |
| H-G | **Double error toasts.** `utils/axiosInstance.ts`'s response interceptor already toasts every API error | Success toasts only; `catch {}` with the house comment (`OdometerPanel.handleSubmit` is the precedent). This is the pre-existing bug several `SettingsCatalog` handlers still have — do not copy those |

---

## Implementation

### ✅ 1. `types/global.types.ts`

Per D9. Then confirm nothing else breaks: `profilePicture` has exactly one grep hit today (its own
declaration), so this cannot ripple.

### ✅ 2. `components/main/shared/UserAvatar.tsx` (new)

Per D1. Purely presentational: `useState` for the load-failure flag, `useEffect` to reset it on
`image?.url` change, no other hooks. Export `UserAvatar` and `initials` from `shared/index.ts` alongside
the existing exports.

### ✅ 3. `components/main/SettingsCatalog/ProfilePanel.tsx` (new)

Per D3–D7. Shape:

```tsx
export function ProfilePanel() {
  const { user, handleSetUser } = useUserContext();
  const { data: profile } = useFetchData<IUser>(["profile"], "/auth/me");
  const updateName  = usePatch([["profile"]]);
  const uploadPhoto = usePut([["profile"]]);
  const removePhoto = useDelete([["profile"]]);

  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");

  const photoBusy = uploadPhoto.isPending || removePhoto.isPending;

  // seed the field from whichever source has an opinion, each time the editor opens
  useEffect(() => {
    if (expanded) setName(profile?.data?.name ?? user?.name ?? "");
  }, [expanded, profile, user]);
  ...
}
```

**`handleSaveName`** — trim, bail with a toast if empty (the server 400s on blank too, H1 there), `PATCH
/auth/update-profile` with `{ name: trimmed }`, then `applyUser({ name: trimmed })`, success toast,
`setExpanded(false)`. `catch {}` per H-G.

**`pickPhoto(source: "camera" | "library")`** — request the matching permission (toast + return on denial),
launch with D6's options, bail on `canceled`, build the file with `ImagePickerField`'s `assetToFile` shape
(`{ uri, name: asset.fileName ?? "avatar.jpg", type: asset.mimeType ?? "image/jpeg" }`), then:

```tsx
const formData = new FormData();
formData.append("image", file as any);           // field name per server spec 53 D2
const result = await uploadPhoto.mutateAsync({ url: "/auth/profile-picture", payload: formData });
if (result?.success) {
  await applyUser({ profilePicture: result?.data?.profilePicture ?? null });
  Toast.show({ type: "success", text1: "Profile photo updated", position: "top" });
}
```

Read success off `result?.success` — that is what `usePut` resolves (`apiPut` returns `response.data`), and
it is how `BikeAccessoryCard` already does it. Wrap in `try`/`catch {}` per H-G.

**`handleRemovePhoto`** — `confirm({ title: "Remove profile photo?", message: "Your initials will be shown
instead.", confirmLabel: "Remove", tone: "danger", icon: "image-off-outline", onConfirm })`, then `DELETE
/auth/profile-picture`, `applyUser({ profilePicture: null })`, success toast.

Styles: copy `OdometerPanel`'s `panel` / `panelHeader` / `panelTitleCol` / `panelTitle` block verbatim so
the three Settings panels stay pixel-consistent, then add only what is new (`avatarWrap`, `cameraBadge`,
`photoBlock`, `photoActions`, `photoBtn`, `photoOverlay`, `emailNote`).

### ✅ 4. `components/main/SettingsCatalog/SettingsCatalog.tsx`

- `import { ProfilePanel } from "./ProfilePanel";` and render `<ProfilePanel />` as the first child of the
  `ScrollView`, immediately before `<OdometerPanel />`.
- Delete the `{user?.email ? ... : null}` block from the Account panel (D8) and the now-unused
  `accountEmail` style. ~~**Keep** `user` destructured from the context — `logoutFunction` and `token` still
  come from there and `isAdminToken(token)` still needs it.~~ **Wrong, corrected during implementation
  (2026-10-18):** `user` was read in exactly one place in this file — the email line being removed — so keeping
  it leaves an unreferenced binding and `@typescript-eslint/no-unused-vars` fails on it. The destructure is now
  `{ token, logoutFunction }`. `isAdminToken` takes the **token**, not the user, which is what the original
  sentence confused.

### ✅ 5. `app.json` — optional, and only if a build is imminent

`expo-image-picker`'s `photosPermission`/`cameraPermission` strings say "to attach receipt/service/damage
photos". Reword to "…receipt/service/damage photos or set your profile photo." These strings are baked into
native config, so they only take effect in the **next EAS build** — the feature itself works without one,
since the plugin is already configured. Leave them alone if no build is planned, and note it in the tracker. **Done 2026-10-18 — reworded**, because a
build here is not merely planned but *owed*: the whole backlog on this branch has never been built at all, so the
next EAS run picks these strings up for free.

### ✅ 6. Docs

- `ai context/progress-tracker.md`: a spec 56 row (added when this file was written, per the standing rule)
  plus a Recent Activity entry on completion, and a Known Gaps line for whatever V-items stay open.
- `CLAUDE.md`: its Settings description and its `types/global.types.ts` note both change.
- `ai context/architecture.md`: if it lists `components/main/shared/*`, add `UserAvatar`.

---

## Dependencies

**No new packages, no new native module, no EAS rebuild required.** Everything is already in
`package.json` and already used:

| Package | Already used by |
| --- | --- |
| `expo-image-picker` (~17.0.11) | `ImagePickerField`, `MultiImagePickerField` — and already registered in `app.json` `plugins` |
| `expo-image` (~3.0.11) | `ImagePickerField`, `ImageViewerModal`, `BikeCard` |
| `@expo/vector-icons` | every screen |
| `react-native-paper` | `Text`, `ActivityIndicator` |
| `react-native-toast-message` | every mutation in the app |
| `@tanstack/react-query` via `hooks/useApi` | `useFetchData`, `usePatch`, `usePut`, `useDelete` — all four exist already, unchanged |

**Deliberately not added: `expo-image-manipulator`** (D6). It is the one package the reference project needed
and it is a native module — adding it invalidates the current JS-only update path and forces an EAS build
before anything can be tested.

No change to `utils/api.ts`, `utils/axiosInstance.ts` (its request interceptor already sets
`multipart/form-data` for a `FormData` body) or `hooks/useApi.ts`.

**One external dependency**: server spec 53 must be deployed *and its migration applied* first.

---

## Verify

`npx tsc --noEmit` + `yarn lint` first, then a real device against the deployed server — note that
`utils/envConfig.ts` hardcodes `https://bikelog-server.vercel.app`, so a local server needs that file
edited and **not committed**. Per this app's standing gap, nothing here can be closed by static review
alone: the camera, the 1:1 crop UI, the permission prompts and the circle's rendering have no substitute.

- [x] **V1** `npx tsc --noEmit` clean and `yarn lint` clean (no new findings). **Done 2026-10-18** — both clean, 0
      problems. Two findings lint caught on the way, both fixed: an unused `tint` import in `ProfilePanel`, and
      `user` left destructured but unreferenced in `SettingsCatalog` once the email line moved out (see §4).
- [ ] **V2** Settings renders five panels in order — Profile, Odometer, Maintenance types, Engine oil types,
      Account (plus Admin for an admin account) — and the Account panel no longer prints the email.
- [ ] **V3** Fresh login, no photo set: the Profile panel shows the initials circle with the camera badge,
      the **name from `/auth/me`** (this is the first time the app has ever displayed it) and the email.
- [ ] **V4** An account with no `name` at all → `"?"` in the circle, no crash (H-A).
- [ ] **V5** `Edit` expands the editor inline, seeds the Name field with the current name, shows the 88 pt
      avatar with `Add photo` and **no** `Remove photo`; `Close` collapses it. Toggling twice re-seeds the
      field rather than keeping an edited value.
- [ ] **V6** Change the name → Save → success toast, the collapsed row updates immediately, the editor
      closes. Pull Settings away and back: the new name persists. **Force-kill and relaunch**: the new name
      is there before `/auth/me` could have resolved (`applyUser` persisted it, D7).
- [ ] **V7** Save with a blank / whitespace-only name → the button is disabled, and if forced, a toast and
      no request. Save with the name unchanged → disabled.
- [ ] **V8** `Add photo` → `Alert` with Take Photo / Choose from Library / Cancel. **Library**: pick an
      image → the 1:1 crop UI appears → spinner on the avatar → success toast → both the 88 pt and 56 pt
      avatars show the photo, and `Remove photo` appears. **Camera**: same, on a real device.
- [ ] **V9** 360 dp width, a long name ("Moniruzzaman Billal Chowdhury") and a long email: one line each,
      ellipsised, the `Edit` button not pushed off-screen (H-D).
- [ ] **V10** `Change photo` with a different image → the new photo replaces the old everywhere, no stale
      bitmap (H-E).
- [ ] **V11** `Remove photo` → the confirm dialog → confirm → initials return in both avatars,
      `Remove photo` disappears. Cancel → nothing changes, no toast.
- [ ] **V12** A very large source photo (12 MP+) → either it uploads, or the server's 400 arrives as a
      readable toast and the avatar is unchanged. **Record which**, with the approximate file size — this is
      the measurement D6's no-client-resize decision rests on. If it refuses routinely, the follow-up is
      `expo-image-manipulator` in its own spec, not a change here.
- [ ] **V13** **The H-B check, and the one most likely to find a real bug.** With the server at
      `JWT_ACCESS_EXPIRES_IN=60s`, open Settings, wait past expiry, then upload a photo. Expected: the
      interceptor refreshes and the replayed `PUT` succeeds. If the retry fails or uploads an empty part,
      stop and write sub-spec `56a` with the finding — do not patch `utils/axiosInstance.ts` ad hoc.
      Repeat for the `PATCH` and the `DELETE` (both JSON, both expected to replay cleanly).
- [ ] **V14** Deny photo-library permission → the denial toast, no crash, no request. Same for camera.
- [ ] **V15** Log out and log in as a second account → no trace of the first account's name or photo at any
      point, including the first frame (H-C: `queryClient.clear()` on login).
- [ ] **V16** Airplane mode → upload shows the interceptor's offline error toast, the avatar is unchanged,
      the app stays usable, and the rider is **not** logged out (spec 51b's rule still holds on this route).
- [ ] **V17** Point `UserAvatar` at a deliberately broken URL (edit the persisted user) → initials, not an
      empty circle (D1's `onError`).
- [ ] **V18** The accessory, issue and document image flows are unchanged — the check that
      `ImagePickerField.tsx` was not touched (D2).
- [ ] **V19** `grep -rn "function initials" components` finds exactly one definition, in `UserAvatar.tsx`.
- [ ] **V20** The whole panel is unreachable without a session: log out → redirected to `/auth`, and
      `/auth/me` is not called.

---

## Out of scope

- **Editing the email or the password.** Both are server-side work this spec's companion deliberately does
  not do (email is the unique login key and needs verification; a password change needs the current
  password). The Email field is rendered disabled with a caption saying so.
- **Showing the avatar anywhere else.** The reference project puts it in its Home header; this app's
  Dashboard header is "My bikes" with a bike count and no identity element, and inventing one is a product
  decision nobody asked for. `UserAvatar` is built as a shared component so a later spec can place it
  without a refactor.
- **Tapping the avatar to open a full-screen viewer** (`ImageViewerModal`). It is a 512 px avatar.
- **Queuing an upload for offline.** Needs a round trip by definition; the app has no mutation queue.
- **A client-side resize** (`expo-image-manipulator`) — D6, revisit only if V12 says so.
- **Any change to `utils/axiosInstance.ts`, `context/user.context.tsx` or `utils/AuthGuard.tsx`** — see H-B
  and D7.
- **A matching `bikelog_client-web-` screen.** Server spec 53 is purely additive, so cascade step 3 is not
  triggered and the web client is not broken by any of this. Per the app-first rule, do not port it for
  parity's sake.
