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
	setSaved: (entry: EntryRef, saved: boolean) => Promise<void>;
	share: (entry: EntryRef) => void;
};

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
			} catch {}
		},
	};
}
