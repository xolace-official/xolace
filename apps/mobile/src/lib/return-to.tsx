import { type Href, useFocusEffect, useRouter } from "expo-router";

export function ReturnTo({ href }: { href: Href }) {
	const router = useRouter();
	useFocusEffect(() => {
		router.dismissTo(href);
	});
	return null;
}
