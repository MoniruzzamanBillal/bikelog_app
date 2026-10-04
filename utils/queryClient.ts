import { QueryClient } from "@tanstack/react-query";

// ! Module-level singleton, importable outside React. `utils/axiosInstance.ts`'s 401 branch
// ! runs at module scope and cannot use `useQueryClient()`, yet it has to `clear()` the cache
// ! too (spec 48 §A) — so the instance lives here rather than inside `app/_layout.tsx`.
export const queryClient = new QueryClient();
