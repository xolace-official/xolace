import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useStablePaginatedQuery } from "@/src/lib/convex/use-stable-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { patchSaved } from "@/src/features/quotes/hooks/use-today-quote";

/**
 * The archive: kept quotes, newest first, paginated.
 *
 * `useStablePaginatedQuery` by ruling of #311. Args are fixed here, so the raw
 * hook would also work; what the stable one buys is that a reactive reset —
 * an unsave from the open sheet, a re-auth — can never blank the list to
 * `LoadingFirstPage` + `[]` under the user's hands. The cost is that it also
 * holds `LoadingMore`, so a footer spinner keyed on `status` will not appear:
 * render the next page's arrival, not its wait.
 */
export function useSavedQuotes(initialNumItems = 12) {
  const page = useStablePaginatedQuery(api.dailyQuotes.listSaved, {}, { initialNumItems });
  const unsaveQuote = useMutation(api.dailyQuotes.unsave).withOptimisticUpdate(
    // -1 outright: the chip only exists inside an open, saved card, so unlike
    // the star there is no second tap to guard against.
    (store, args) => patchSaved(store, args.quoteId, false, -1),
  );
  const posthog = usePostHog();

  /**
   * The row leaving the stack is the chip's feedback and Convex reactivity
   * supplies it, but the count strip above the stack reads `getToday` — so the
   * same optimistic patch the star uses runs here, or "26 kept" survives a tap
   * that removed one. Counted only once the write landed, so a failure is not
   * scored as an unsave.
   */
  const unsave = async (quoteId: Id<"daily_quotes">, type: "session" | "curated") => {
    try {
      await unsaveQuote({ quoteId });
      posthog.capture("quote_unsaved", { quote_type: type });
    } catch (e) {
      console.error("[quotes] unsave failed", e);
    }
  };

  return { ...page, unsave };
}
