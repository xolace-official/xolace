import { type Href, useFocusEffect, useRouter } from "expo-router";

/**
 * expo-router's `Redirect`, but back to `href` when it is already in the stack
 * (a route of the tabs, say) instead of stacking a second copy of it, which
 * `Redirect`'s replace does. Replaces only when `href` isn't there yet, as on a
 * cold start.
 */
export function ReturnTo({ href }: { href: Href }) {
	const router = useRouter();
	useFocusEffect(() => {
		router.dismissTo(href);
	});
	return null;
}
