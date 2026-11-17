/**
 * The reader's data hook: the entry, its read signals, Up next, the narration, the appearance,
 * and every action the page takes (save, share, This helped, Reflect on this, the sheets). The
 * one reader file, with its signal and audio hooks, that calls Convex, PostHog or the toast.
 */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { Presets } from "react-native-pulsar";
import { toast } from "@/components/shared/toast";
import { COPY } from "@/features/lantern/copy";
import type { Reader } from "@/features/lantern/reader/reader-data";
import {
	READ_OPENS_AT,
	REFLECT_PROMPT,
	type ReaderEntry,
} from "@/features/lantern/reader/reader-model";
import { useEntryAudio } from "@/features/lantern/reader/use-entry-audio";
import {
	useReadSignals,
	useRecord,
} from "@/features/lantern/reader/use-read-signals";
import { useReadingPrefs } from "@/features/lantern/reader/use-reading-prefs";
import { useEntryActions } from "@/features/lantern/use-entry-actions";
import { playResonanceToggle, playSoftPress } from "@/lib/haptics";
import { type ReaderFrom, trackLibrary } from "@/lib/library-analytics";
import { useAppStore } from "@/store/store";

const DAY_MS = 86_400_000;

type Params = { from?: ReaderFrom; hub?: string; stepId?: Id<"path_steps"> };

/** The entry by slug: undefined while it loads, null once it's not in Lantern. */
export const useReaderEntry = (slug: string) =>
	useQuery(api.library.entries.getEntry, { slug });

export function useReader(
	entry: ReaderEntry,
	{ showHelpline }: { showHelpline: boolean }
): Reader {
	const { from, hub, stepId } = useLocalSearchParams<Params>();
	const posthog = usePostHog();
	const signals = useReadSignals({
		entryId: entry._id,
		from,
		readMin: entry.readMin,
		slug: entry.slug,
		stepId,
	});
	const next = useQuery(api.library.next.getNext, { entryId: entry._id, hub });
	const audio = useEntryAudio(entry._id, entry.slug, !!entry.listenMin);
	const prefs = useReadingPrefs();
	const record = useRecord();
	const { share } = useEntryActions();
	const setPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const state = signals.state;

	return {
		actions: {
			audio: audio.actions,
			leaveAt: signals.leaveAt,
			openAppearance: () => router.push("/reader-appearance"),
			openHelpline: () => router.push("/crisis-resources?from=library"),
			openSources: () =>
				router.push({
					params: { slug: entry.slug },
					pathname: "/reader-sources",
				}),
			reachEnd: signals.reachEnd,
			reflect: () => {
				const prompt = entry.reflectPrompt ?? REFLECT_PROMPT;
				setPrompt({
					expiresAt: Date.now() + DAY_MS,
					fromEntryId: entry._id,
					label: entry.title,
					text: prompt,
				});
				trackLibrary(posthog, "library_reflect_started", {
					curated: !!entry.reflectPrompt,
					slug: entry.slug,
				});
				router.dismissTo("/");
			},
			resumed: () => {
				playSoftPress();
				trackLibrary(posthog, "library_resume_tapped", { slug: entry.slug });
			},
			share: (e) => share(e ?? entry),
			toggleHelped: () => {
				const helped = !state?.helped;
				(helped ? playResonanceToggle : playSoftPress)();
				record({ entryId: entry._id, helped }).catch(() => undefined);
				trackLibrary(posthog, "library_entry_helped", {
					helped,
					slug: entry.slug,
				});
			},
			toggleSave: () => {
				if (!state) {
					return;
				}
				const saved = !state.saved;
				Presets.System.selection();
				record({ entryId: entry._id, saved }).catch(() => undefined);
				// From the reader, saving says where to find it.
				toast(saved ? COPY.reader.savedToast : COPY.reader.unsavedToast, {
					variant: saved ? "success" : "default",
				});
			},
		},
		state: {
			audio: audio.state,
			entry,
			hub,
			next,
			opensAt: READ_OPENS_AT,
			prefs: prefs.state,
			showHelpline: showHelpline && entry.kind === "explainer",
			signals: state,
		},
	};
}
