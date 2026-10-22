import { useRef } from "react";
import { useQuery, usePaginatedQuery } from "convex/react";

/**
 * Drop-in replacement for `useQuery` for parametrized queries.
 *
 * Unlike `useQuery`, this does not return `undefined` while reloading after the
 * query arguments change — it keeps returning the previously loaded data until
 * the new data finishes loading. This prevents subtrees guarded by `&& data`
 * from unmounting (and re-running mount animations) on every arg change.
 *
 * Use when the args to a query change in response to user interaction (paging,
 * filtering, switching tabs) and the transient `undefined` would blank/unmount
 * the UI. Prefer plain `useQuery` for queries whose args are stable — there the
 * only `undefined` is the genuine first-load state you want to show a skeleton
 * for.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 */
export const useStableQuery = ((name, ...args) => {
  const result = useQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // `result` is only undefined while data is loading; once a fresh result is
  // available, store it so we can keep returning it during the next reload.
  if (result !== undefined) {
    stored.current = result;
  }

  // undefined on first load, stale data while reloading, fresh data otherwise.
  return stored.current;
}) as typeof useQuery;

/**
 * Drop-in replacement for `usePaginatedQuery` for parametrized queries.
 *
 * When the query args change (e.g. a filter/sort toggle on a paginated list),
 * `usePaginatedQuery` resets `page` to `[]` and `status` to `LoadingFirstPage`,
 * which blanks the list. This keeps returning the previously loaded page/status
 * until the new first page has finished loading, so the list stays put and
 * swaps in place.
 *
 * Use only when the paginated query's args change from user interaction. For a
 * plain infinite-scroll list with fixed args, use `usePaginatedQuery` directly.
 *
 * See https://stack.convex.dev/help-my-app-is-overreacting for details.
 */
export const useStablePaginatedQuery = ((name, ...args) => {
  const result = usePaginatedQuery(name, ...args);
  const stored = useRef(result); // ref objects are stable between rerenders

  // Hold the last settled result while a new first page loads after an arg
  // change; only overwrite once we're past the loading states.
  if (result.status !== "LoadingMore" && result.status !== "LoadingFirstPage") {
    stored.current = result;
  }

  // `isLoading` stays live: the held page/status masks the in-flight fetch,
  // and a list still needs to know when to show its footer spinner.
  return { ...stored.current, isLoading: result.isLoading };
}) as typeof usePaginatedQuery;
