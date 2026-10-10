import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
  SectionLoading,
  SegmentedTabs,
} from "@/components/main/shared";
import { useUserContext } from "@/context/user.context";
import { useFetchData } from "@/hooks/useApi";
import {
  TErrorLog,
  TErrorLogListPayload,
  TErrorLogMethodFilter,
} from "@/types/error-log.types";
import { COLORS } from "@/utils/colors";
import { isAdminToken } from "@/utils/isAdmin";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { ErrorLogCard } from "./ErrorLogCard";
import { ErrorLogDetailModal } from "./ErrorLogDetailModal";

const PAGE_SIZE = 20;

const METHOD_OPTIONS: { value: TErrorLogMethodFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DEL" },
];

export function ErrorLogsPage() {
  const { token } = useUserContext();
  const scrollRef = useRef<ScrollView>(null);

  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<TErrorLogMethodFilter>("all");
  const [selected, setSelected] = useState<TErrorLog | null>(null);

  const admin = isAdminToken(token);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    sort: "-createdAt",
  });
  if (method !== "all") query.set("method", method);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useFetchData<TErrorLogListPayload>(
      // ! `page` AND `method` must be in the key, or TanStack serves one page's / filter's
      // ! cache for every other. (First page-button-driven read in this app — no pattern to copy.)
      ["error-logs", String(page), method],
      `/admin/error-logs?${query.toString()}`,
      {
        // Belt and braces with the Settings entry being hidden: a non-admin never fires the request.
        enabled: admin,
        // Keeps the current page on screen while the next one loads instead of flashing a skeleton.
        placeholderData: (previous) => previous,
        // ! No retries. React Query's default (3, with backoff) turns a 403 — e.g. an admin who
        // ! was demoted after logging in — into four requests, four toasts (the interceptor
        // ! toasts every failure) and ~7s of skeleton before the error state shows. The
        // ! interceptor flattens every status to 500, so a 403 can't be told from a network blip
        // ! here; "Try again" and pull-to-refresh cover the transient case instead.
        retry: false,
      },
    );

  const logs = data?.data?.result ?? [];
  // ! `meta` is a raw ROW COUNT here, not `{ totalPages }` — compute the page count ourselves.
  const total = data?.data?.meta ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const goToPage = (next: number) => {
    setPage(next);
    // Otherwise the next page opens scrolled to wherever the previous one was left.
    scrollRef?.current?.scrollTo({ y: 0, animated: false });
  };

  const changeMethod = (next: TErrorLogMethodFilter) => {
    setMethod(next);
    setPage(1);
  };

  if (!admin) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Error logs" backLabel="Back" />
        <View style={styles.page}>
          <EmptyState
            icon="lock-outline"
            title="Admins only"
            message="This screen is restricted to admin accounts."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Error logs"
        subtitle="Server errors from the last 30 days"
        backLabel="Back"
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.accent}
          />
        }
      >
        <SegmentedTabs
          value={method}
          onChange={changeMethod}
          options={METHOD_OPTIONS}
          fill
        />

        {isError ? (
          <ErrorState
            title="Couldn't load error logs"
            // ! The axios interceptor already toasted the server's message — this must not add a second toast.
            message={(error as { message?: string })?.message ?? "Please try again."}
            onRetry={refetch}
          />
        ) : isLoading ? (
          <SectionLoading count={4} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon="shield-check-outline"
            title="No errors logged"
            message={
              method === "all"
                ? "Nothing has failed in the last 30 days. Entries expire automatically."
                : `No ${method} errors in the last 30 days.`
            }
          />
        ) : (
          <>
            <Text style={styles.count}>
              {total} {total === 1 ? "error" : "errors"} · page {page} of {totalPages}
            </Text>

            <View style={styles.list}>
              {logs.map((log) => (
                <ErrorLogCard
                  key={log?._id}
                  log={log}
                  onPress={() => setSelected(log)}
                />
              ))}
            </View>

            {totalPages > 1 ? (
              <View style={styles.pager}>
                <PrimaryButton
                  onPress={() => goToPage(page - 1)}
                  variant="secondary"
                  icon="chevron-left"
                  disabled={page <= 1}
                  style={styles.pagerBtn}
                >
                  Prev
                </PrimaryButton>
                <PrimaryButton
                  onPress={() => goToPage(page + 1)}
                  variant="secondary"
                  icon="chevron-right"
                  disabled={page >= totalPages}
                  style={styles.pagerBtn}
                >
                  Next
                </PrimaryButton>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <ErrorLogDetailModal log={selected} onDismiss={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  page: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  count: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  list: {
    gap: 10,
  },
  pager: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  pagerBtn: {
    flex: 1,
  },
});
