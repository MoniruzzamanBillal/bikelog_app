import { TStatusTone } from "@/components/main/shared";

// 5xx = server fault, 401/403 = auth, everything else (validation, 404, 409) neutral.
// Same rule as the web client's `errorLogStatus.ts`, so both clients read an error alike.
export const getStatusTone = (status: number): TStatusTone =>
  status >= 500
    ? "danger"
    : status === 401 || status === 403
      ? "warning"
      : "neutral";
