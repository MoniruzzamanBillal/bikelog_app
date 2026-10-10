// Hand-mirrors bikelog_server's ErrorLog row (prisma/schema.prisma) plus the `_id` that
// errorLog.service.ts's `toApiShape` adds. No shared types package — kept in sync by hand.

/** `path` can be a number (Zod array-index paths) or empty (404 rows). */
export type TErrorLogSource = {
  path: string | number;
  message: string;
};

export type TErrorLog = {
  _id: string;
  status: number;
  message: string;
  errorName?: string | null;
  // A JSON column, so this is what it is *supposed* to hold, not a guarantee — render it
  // behind an Array.isArray check rather than trusting the type.
  errorSources?: TErrorLogSource[] | null;
  // Absent on 404 rows: that error is synthetic, so the server deliberately stores no stack.
  stack?: string | null;
  method: string;
  path: string;
  userId?: string | null;
  userEmail?: string | null;
  createdAt: string;
};

/**
 * The `data` of `GET /admin/error-logs`. `meta` is a raw ROW COUNT (a number), not a
 * `{ page, limit, total, totalPages }` object — callers compute `totalPages` themselves.
 */
export type TErrorLogListPayload = {
  result: TErrorLog[];
  meta: number;
};

export type TErrorLogMethodFilter =
  | "all"
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";
