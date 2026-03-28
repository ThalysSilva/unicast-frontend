"use client";

import {
  type QueryKey,
  type UseQueryOptions,
  useQuery,
} from "@tanstack/react-query";

type UseApiQueryOptions<TQueryFnData, TData = TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData, Error, TData, QueryKey>,
  "queryKey" | "queryFn"
> & {
  queryKey: QueryKey;
  queryFn: () => Promise<TQueryFnData>;
};

export function useApiQuery<TQueryFnData, TData = TQueryFnData>({
  queryKey,
  queryFn,
  ...options
}: UseApiQueryOptions<TQueryFnData, TData>) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}
