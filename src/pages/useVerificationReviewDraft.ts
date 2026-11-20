import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

export function useVerificationReviewDraft<T extends object>(scope: readonly (string | number)[], initial: T) {
  const client = useQueryClient();
  const key = ["verificationReviewDraft", ...scope];
  const query = useQuery({
    queryKey: key,
    queryFn: skipToken,
    initialData: initial,
    staleTime: Infinity,
    // Drafts survive route changes in memory. AuthProvider clears this cache on account changes and logout.
    gcTime: Infinity,
  });
  const update = (patch: Partial<T>) => {
    client.setQueryData<T>(key, current => ({ ...initial, ...current, ...patch }));
  };
  return [query.data ?? initial, update] as const;
}
