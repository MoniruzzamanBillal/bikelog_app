# 12: Bike Issues

Status: ✅ Complete

## Goal

Build the bike issues screen (`app/bikes/[bikeId]/issues.tsx` route + `BikeIssue` component + `BikeIssueCard` + `BikeIssueFormModal`): display issues (problems/faults) found on the bike, create/edit via modal, toggle status (open/resolved) via a dedicated guarded endpoint, and swipe-to-delete.

## Context

**Backend contract** (verified via `bikelog_server/postman/`):
- `GET /bikes/:bikeId/issues` — returns paginated issue list.
- `POST /bikes/:bikeId/issues` — body `{ title, description, reportedDate?, notes? }`. All optional except title (required).
- `PATCH /bikes/:bikeId/issues/:id` — generic edit, all fields optional. **Status field is silently stripped** — don't try to change status via generic PATCH.
- `PATCH /bikes/:bikeId/issues/:id/status` — **guarded endpoint**, changes status only. Body `{ status: "open" | "resolved" }`. Sending the same status twice returns 400. This is the only way to change status.
- `DELETE /bikes/:bikeId/issues/:id` — soft delete.

**Form fields**:
- title (string, required).
- description (string, optional).
- reportedDate (date, optional, defaults to today).
- notes (string, optional).

**Status field**:
- Values: "open" or "resolved".
- Displayed as a badge (use `StatusBadge` from spec 02).
- Changed only via the `PATCH /:id/status` endpoint, never via generic edit.
- A dedicated "Toggle Status" or "Mark as Resolved/Open" action button is recommended (not in generic form).

## Design

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `app/bikes/[bikeId]/issues.tsx` | Create | One-liner route wrapper. |
| `components/main/BikeIssue/BikeIssue.tsx` | Create | List component with optional status filter (open/resolved). |
| `components/main/BikeIssue/BikeIssueCard.tsx` | Create | Issue card, shows title, date, status badge. Swipe left to delete. Action button to toggle status. |
| `components/main/BikeIssue/BikeIssueFormModal.tsx` | Create | Create/edit modal, all 4 fields (title/description/reportedDate/notes). No status field. |
| `types/bike-issue.types.ts` | Create | `IBikeIssue`, `TCreateBikeIssuePayload`, etc. |

### BikeIssue component (pseudo-code)

```tsx
export function BikeIssue() {
  const { bikeId } = useLocalSearchParams<{ bikeId: string }>();
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | null>(null);
  const { data, isLoading, refetch } = useFetchData<{
    result: IBikeIssue[];
    meta: number;
  }>(
    ["issues", bikeId, statusFilter],
    `/bikes/${bikeId}/issues?${statusFilter ? `status=${statusFilter}` : ""}`
  );

  const [modalOpen, setModalOpen] = useState(false);

  const issues = data?.result || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Issues</Text>
        <Button onPress={() => setModalOpen(true)}>Report Issue</Button>
      </View>

      {/* Status filter buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === null && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter(null)}
        >
          <Text>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "open" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("open")}
        >
          <Text>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            statusFilter === "resolved" && styles.filterButtonActive,
          ]}
          onPress={() => setStatusFilter("resolved")}
        >
          <Text>Resolved</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <SectionLoading count={3} />
      ) : issues.length === 0 ? (
        <EmptyState label="No issues reported yet." />
      ) : (
        <RefreshControl onRefresh={() => refetch()} refreshing={isLoading}>
          <ScrollView>
            {issues.map((issue) => (
              <BikeIssueCard
                key={issue.id}
                issue={issue}
                bikeId={bikeId}
              />
            ))}
          </ScrollView>
        </RefreshControl>
      )}

      <BikeIssueFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bikeId={bikeId}
      />
    </View>
  );
}
```

### BikeIssueCard component

```tsx
export function BikeIssueCard({
  issue,
  bikeId,
}: {
  issue: IBikeIssue;
  bikeId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);
  const { mutateAsync: toggleStatusMutation } = usePatch([["issues", bikeId]]);
  const { mutateAsync: deleteMutation } = useDelete([["issues", bikeId]]);

  const handleToggleStatus = async () => {
    const newStatus = issue.status === "open" ? "resolved" : "open";
    try {
      await toggleStatusMutation({
        url: `/bikes/${bikeId}/issues/${issue.id}/status`,
        payload: { status: newStatus },
      });
      Toast.show({ type: "success", text1: `Issue marked as ${newStatus}` });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to update status",
      });
    }
  };

  const handleDelete = () => {
    confirmDelete("issue", async () => {
      await deleteMutation({ url: `/bikes/${bikeId}/issues/${issue.id}` });
    });
    swipeableRef.current?.close();
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={() => (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteAction}>
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{issue.title}</Text>
            <StatusBadge
              label={issue.status}
              colorKey={issue.status === "open" ? "open" : "resolved"}
            />
          </View>

          {issue.description && (
            <Text style={styles.description}>{issue.description}</Text>
          )}

          <Text style={styles.date}>
            Reported: {format(new Date(issue.reportedDate), "dd MMM yyyy")}
          </Text>

          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.statusButton}
          >
            {issue.status === "open"
              ? "Mark as Resolved"
              : "Reopen Issue"}
          </Button>
        </View>
      </Swipeable>

      <BikeIssueFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bikeId={bikeId}
        initialIssue={issue}
      />
    </>
  );
}
```

### BikeIssueFormModal

```tsx
export function BikeIssueFormModal({
  open,
  onClose,
  bikeId,
  initialIssue,
}: {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  initialIssue?: IBikeIssue;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportedDate, setReportedDate] = useState("");
  const [notes, setNotes] = useState("");

  const { mutateAsync: createMutation } = usePost([["issues", bikeId]]);
  const { mutateAsync: updateMutation } = usePatch([["issues", bikeId]]);

  useEffect(() => {
    if (initialIssue && open) {
      setTitle(initialIssue.title || "");
      setDescription(initialIssue.description || "");
      setReportedDate(format(new Date(initialIssue.reportedDate), "yyyy-MM-dd"));
      setNotes(initialIssue.notes || "");
    } else if (!initialIssue && open) {
      setTitle("");
      setDescription("");
      setReportedDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
    }
  }, [initialIssue, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Title is required" });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      reportedDate: reportedDate || new Date().toISOString(),
      notes: notes.trim() || undefined,
      // Never send status
    };

    try {
      if (initialIssue) {
        await updateMutation({
          url: `/bikes/${bikeId}/issues/${initialIssue.id}`,
          payload,
        });
        Toast.show({ type: "success", text1: "Issue updated" });
      } else {
        await createMutation({
          url: `/bikes/${bikeId}/issues`,
          payload,
        });
        Toast.show({ type: "success", text1: "Issue reported" });
      }
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.message || "Failed to save issue",
      });
    }
  };

  return (
    <Portal>
      <Modal visible={open} onDismiss={onClose} contentContainerStyle={styles.modal}>
        <KeyboardAwareScrollView style={styles.scrollView}>
          <Text style={styles.title}>
            {initialIssue ? "Edit Issue" : "Report Issue"}
          </Text>

          <TextInput
            mode="flat"
            label="Issue Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Reported Date (YYYY-MM-DD)"
            value={reportedDate}
            onChangeText={setReportedDate}
            style={styles.input}
          />

          <TextInput
            mode="flat"
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
          >
            {initialIssue ? "Update" : "Report"}
          </Button>

          <Button onPress={onClose} style={styles.cancelButton}>
            Cancel
          </Button>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}
```

## Implementation

1. **Create `types/bike-issue.types.ts`**: `IBikeIssue`, `TCreateBikeIssuePayload`.
2. **Create `components/main/BikeIssue/` folder** and 3 component files.
3. **Create `app/bikes/[bikeId]/issues.tsx`** route wrapper.
4. **Use `StatusBadge` from spec 02** for status display.
5. **Key detail**: Status is changed ONLY via `PATCH /:id/status`, never via generic PATCH.
6. **Test CRUD**: Create, edit (without changing status), delete issues.
7. **Test status toggle**: Verify the dedicated `/status` endpoint is called, not generic PATCH.
8. **Test filter**: All/Open/Resolved tabs work.
9. **Run `expo lint`**.

## Dependencies

Spec 06 (Bike hub) must exist first.

Spec 02 (shared components, specifically `StatusBadge`) should be done first.

## Verify

- [x] **Issues list displays** *(code-verified only — no simulator/device in this environment)*: `BikeIssue.tsx` fetches `useFetchData<TBikeIssuesApiResponse>([...], "/bikes/${bikeId}/issues?page=...&limit=...&sort=-dateReported...")`, reads `data?.data?.result ?? []`, maps to `BikeIssueCard` (title, description, `dateReported` formatted `dd MMM yyyy`, status badge).
- [x] **Status badge uses StatusBadge component**: `<StatusBadge label={issue.status} colorKey={issue.status} colors={issueStatusColors} />` from spec 02.
- [x] **Status filter works**: All/Open/Resolved pill buttons, `statusFilter` state appended as `&status=...` query param, included in the query key so each filter is cached separately; resets to page 1 on change.
- [x] **Create issue succeeds**: `BikeIssueFormModal` posts `TCreateBikeIssuePayload` (`title`, `description?`, `dateReported?` — no `status`, no `notes`; see Implementation Note) to `POST /bikes/${bikeId}/issues`.
- [x] **Edit issue succeeds**: right-swipe (`renderLeftActions`) or tap opens the modal with `initialIssue` set, prefilled via `useEffect` on `[initialIssue, open]`; payload has no status field.
- [x] **Delete issue succeeds**: left-swipe (`renderRightActions`) → `confirmDelete()` → `DELETE /bikes/${bikeId}/issues/${issue._id}`.
- [x] **Toggle status succeeds**: dedicated "Mark as Resolved"/"Reopen Issue" button calls `PATCH /bikes/${bikeId}/issues/${issue._id}/status` with `{status: newStatus}` — a separate `usePatch` mutation from the generic edit one, never conflated.
- [x] **Status is never in edit form**: `BikeIssueFormModal`'s payload type (`TCreateBikeIssuePayload`/`TUpdateBikeIssuePayload`) has no `status` field at all — enforced at the type level, not just by omission convention.
- [x] **Reopen works**: same toggle button/endpoint, `newStatus = issue.status === "open" ? "resolved" : "open"` — symmetric in both directions.
- [x] **400 on duplicate status**: not exercised against a live backend (none running this session), but the `catch` block surfaces `error?.message` from the axios-normalized error, and the backend does throw 400 with a descriptive message for this case (confirmed in `bikeIssue.service.ts`'s `updateBikeIssueStatus`: `if (issue.status === status) throw new AppError(400, ...)`) — the error would display correctly, just not been seen firsthand.
- [x] **`expo lint` is clean**: 0 errors, 0 warnings. `tsc --noEmit` also passes clean.

**Implementation Note**: this spec's own field list included an optional `notes` field, but the actual backend (`bikelog_server/src/app/modules/bikeIssue/bikeIssue.interface.ts` and `.validation.ts`) has no such field at all — only `title`, `description`, `dateReported`, `status`. The implementation correctly omitted it. Also used `dateReported` (the real field name) instead of the spec sample's `reportedDate`, and `_id` instead of `id`. This checklist was not filled in when the spec was originally marked complete; annotated during a later review pass (2026-07-22) — no code changes were needed, the implementation was already correct.
