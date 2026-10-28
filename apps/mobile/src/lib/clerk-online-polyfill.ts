/** Forces `navigator.onLine` to true: Clerk gates JWT refresh on it and Hermes can define it
 * `false` (`clerk_offline`). Runs before `@clerk/expo`. */
try {
	if (typeof navigator !== "undefined" && navigator.onLine !== true) {
		Object.defineProperty(navigator, "onLine", {
			configurable: true,
			get: () => true,
		});
	}
} catch {
	// `navigator.onLine` is non-configurable in this runtime — nothing to do.
}
