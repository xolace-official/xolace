import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { usePostHog } from "posthog-react-native";
import { Share } from "react-native";
import { lanternShareUrl } from "@/lib/lantern-share-links";
import { trackLibrary } from "@/lib/library-analytics";

type EntryItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];
const THOUSAND = 1000;

export const capitalise = (s: string) =>
	s[0].toUpperCase() + s.slice(1).toLowerCase();
export const facetLabel = (slug: string) => capitalise(slug.replace(/-/g, " "));
const compact = (n: number) =>
	n < THOUSAND ? `${n}` : `${(n / THOUSAND).toFixed(1).replace(/\.0$/, "")}k`;
export const readTimeLine = (readMin: number, views = 0, listenMin?: number) =>
	[
		`${readMin} min read`,
		listenMin && `${listenMin} min listen`,
		views > 0 && `${compact(views)} ${views === 1 ? "view" : "views"}`,
	]
		.filter(Boolean)
		.join(" · ");

export async function shareEntry(
	entry: Pick<EntryItem, "slug" | "title">,
	posthog: ReturnType<typeof usePostHog>
) {
	const url = lanternShareUrl(entry.slug);
	try {
		const { action } = await Share.share({
			message: `I just read “${entry.title}” on Xolace and thought you might like it too. Worth a few minutes:\n${url}`,
		});
		if (action === Share.sharedAction) {
			trackLibrary(posthog, "library_entry_shared", { slug: entry.slug });
		}
	} catch {}
}
