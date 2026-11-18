/**
 * What every Lantern list does to an entry: save or unsave it, and share it. Each screen's data
 * hook spreads these into its actions, so a row reaches Convex and PostHog only through its
 * screen's provider.
 */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";
import * as Linking from "expo-linking";
import { usePostHog } from "posthog-react-native";
import { Share } from "react-native";
import { Presets } from "react-native-pulsar";
import { COPY } from "@/features/lantern/copy";
import { trackLibrary } from "@/lib/library-analytics";

export type EntryRef = {
	_id: Id<"library_entries">;
	slug: string;
	title: string;
};

export type EntryActions = {
	/** Resolves once the server has answered, so a row can hold the tapped value until then. */
	setSaved: (entry: EntryRef, saved: boolean) => Promise<void>;
	share: (entry: EntryRef) => void;
};

/** A passive write that didn't land; the row falls back to the server's value. */
const logDropped = (e: unknown) => console.warn("[lantern] save dropped:", e);

export function useEntryActions(): EntryActions {
	const record = useMutation(api.library.reads.record);
	const posthog = usePostHog();
	return {
		setSaved: async (entry, saved) => {
			Presets.System.selection();
			await record({ entryId: entry._id, saved }).catch(logDropped);
		},
		share: async (entry) => {
			const url = Linking.createURL(`library/${entry.slug}`, {
				queryParams: { from: "share" },
			});
			try {
				const { action } = await Share.share({
					message: COPY.shareMessage(entry.title, url),
				});
				if (action === Share.sharedAction) {
					trackLibrary(posthog, "library_entry_shared", { slug: entry.slug });
				}
			} catch {
				// The sheet failed to open; nothing was shared.
			}
		},
	};
}
