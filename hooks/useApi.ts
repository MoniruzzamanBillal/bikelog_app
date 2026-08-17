import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/utils/api";
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";

export type TgenericResponse<TData> = {
  data: TData;
  statusCode: number;
  success: boolean;
  message: string;
};

type TFetchOptions<TData> = Omit<
  UseQueryOptions<TgenericResponse<TData>, Error>,
  "queryKey" | "queryFn"
>;

export const useFetchData = <TData>(
  key: string[],
  endPoint: string,
  options?: TFetchOptions<TData>,
) => {
  return useQuery({
    queryKey: key,
    queryFn: () => apiGet(endPoint),
    ...options,
  });
};

export const usePost = (invalidateQueriesKeys?: string[][]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      url: string;
      payload: Record<string, unknown> | FormData | any;
    }) => {
      return apiPost(params.url, params.payload);
    },
    onSuccess: (data) => {
      if (invalidateQueriesKeys) {
        invalidateQueriesKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
};

export const usePatch = (invalidateQueriesKeys?: string[][]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      url: string;
      payload: Record<string, unknown> | FormData;
    }) => {
      return apiPatch(params.url, params.payload);
    },
    onSuccess: () => {
      if (invalidateQueriesKeys) {
        invalidateQueriesKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
};

export const usePut = (invalidateQueriesKeys?: string[][]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      url: string;
      payload: Record<string, unknown> | FormData;
    }) => {
      return apiPut(params.url, params.payload);
    },
    onSuccess: () => {
      if (invalidateQueriesKeys) {
        invalidateQueriesKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
};

export const useDelete = (invalidateQueriesKeys?: string[][]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { url: string }) => {
      return apiDelete(params?.url);
    },
    onSuccess: () => {
      if (invalidateQueriesKeys) {
        invalidateQueriesKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
};
