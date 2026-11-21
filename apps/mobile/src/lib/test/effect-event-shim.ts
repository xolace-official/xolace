type React = typeof import("react");

/**
 * The test renderer (react-reconciler 0.31) predates `useEffectEvent`, so a hook test that
 * reaches one mocks React with this:
 *
 * vi.mock("react", async (original) => {
 *   const { withEffectEventShim } = await import("@/lib/test/effect-event-shim");
 *   return withEffectEventShim(await original<typeof import("react")>());
 * });
 *
 * Same contract: a stable function that calls the latest render's callback.
 */
export function withEffectEventShim(react: React): React {
	const useEffectEvent = <T extends (...args: never[]) => unknown>(
		callback: T
	): T => {
		const latest = react.useRef(callback);
		react.useInsertionEffect(() => {
			latest.current = callback;
		});
		return react.useCallback(
			(...args: Parameters<T>) => latest.current(...args),
			[]
		) as T;
	};
	return { ...react, useEffectEvent } as React;
}
