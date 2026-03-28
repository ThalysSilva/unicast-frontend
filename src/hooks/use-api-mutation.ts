"use client";

import {
  type QueryKey,
  type UseMutationOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useToast } from "@/components/ui/toast-provider";

type UseApiMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueryKeys?: QueryKey[];
  showErrorToast?: boolean;
};

export function useApiMutation<TData, TVariables = void>({
  mutationFn,
  invalidateQueryKeys,
  onError,
  onSuccess,
  showErrorToast = true,
  ...options
}: UseApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn,
    ...options,
    onError: async (error, variables, onMutateResult, context) => {
      if (showErrorToast && error.message) {
        showToast({
          title: error.message,
          variant: "error",
        });
      }

      await onError?.(error, variables, onMutateResult, context);
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (invalidateQueryKeys?.length) {
        await Promise.all(
          invalidateQueryKeys.map((queryKey) =>
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }

      await onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
