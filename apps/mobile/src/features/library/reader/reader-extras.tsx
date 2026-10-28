/**
 * The reader's small moves (#413, CONTEXT.md "Library: what reading can lead
 * to"): the content note, "Reflect on this", sharing, the helpline link and
 * the "Read by the fire" ambience.
 */
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Surface, useThemeColor } from "heroui-native";
import { type PostHog, usePostHog } from "posthog-react-native";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { AppText } from "@/components/shared/app-text";
import { detectCountry } from "@/features/crisis-resources/use-crisis-resources";
import { trackLibrary } from "@/features/library/analytics";
import {
	COVER_BUTTON,
	CoverGlass,
} from "@/features/library/reader/cover-glass";
import {
	REFLECT_PROMPT,
	shareMessage,
} from "@/features/library/reader/reader-copy";
import type { ReaderEntry } from "@/features/library/reader/reader-screen";
import { useAppStore } from "@/store/store";

const NOTE_ICON = {
	android: "info",
	ios: "exclamationmark.circle",
	web: "info",
} as const;
export const SHARE_ICON = {
	android: "share",
	ios: "square.and.arrow.up",
	web: "share",
} as const;
const HELP_ICON = { android: "call", ios: "phone", web: "call" } as const;
export const CHEVRON = {
	android: "chevron_right",
	ios: "chevron.right",
	web: "chevron_right",
} as const;
const DAY_MS = 86_400_000;

/** A curator's heads-up, before the body begins. */
export function ContentNote({ note }: { note: string }) {
	const muted = useThemeColor("muted");
	return (
		<Surface
			accessibilityLabel={`Content note: ${note}`}
			accessible
			className="mb-6 flex-row gap-3 rounded-2xl p-4"
			style={{ borderCurve: "continuous" }}
			variant="secondary"
		>
			<SymbolView name={NOTE_ICON} size={16} tintColor={muted} />
			<View className="flex-1 gap-1">
				<AppText className="font-semibold text-muted text-xs uppercase tracking-widest">
					Content note
				</AppText>
				<AppText className="text-sm">{note}</AppText>
			</View>
		</Surface>
	);
}

/** Leaves the entry for a reflect session that opens on its prompt; the session records the entry. */
export function ReflectOnThis({
	entry,
}: {
	entry: Pick<ReaderEntry, "_id" | "slug" | "title" | "reflectPrompt">;
}) {
	const setPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const posthog = usePostHog();
	const prompt = entry.reflectPrompt ?? REFLECT_PROMPT;
	return (
		<Surface className="mt-10 gap-4 p-5" style={{ borderCurve: "continuous" }}>
			<AppText className="font-semibold text-lg">{prompt}</AppText>
			<Pressable
				accessibilityRole="button"
				className="items-center rounded-full bg-accent py-3 active:opacity-70"
				onPress={() => {
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
				}}
			>
				<AppText className="font-semibold text-accent-foreground">
					Reflect on this
				</AppText>
			</Pressable>
		</Surface>
	);
}

/** Standard share sheet with a deep link to the entry — the reader's button and the cards' menu. */
export async function shareEntry(
	entry: Pick<ReaderEntry, "slug" | "title">,
	posthog: PostHog
) {
	const url = Linking.createURL(`library/${entry.slug}`, {
		queryParams: { from: "share" },
	});
	try {
		const { action } = await Share.share({
			message: shareMessage(entry.title, url),
		});
		if (action === Share.sharedAction) {
			trackLibrary(posthog, "library_entry_shared", { slug: entry.slug });
		}
	} catch {
		// The sheet failed to open; nothing was shared and there's nothing to undo.
	}
}

/** Shares the entry. Sits on the cover. */
export function ShareButton({
	entry,
}: {
	entry: Pick<ReaderEntry, "slug" | "title">;
}) {
	const coverInk = String(useCSSVariable("--color-cover-ink"));
	const posthog = usePostHog();
	return (
		<Pressable
			accessibilityLabel="Share"
			accessibilityRole="button"
			className={COVER_BUTTON}
			hitSlop={8}
			onPress={() => shareEntry(entry, posthog)}
		>
			<CoverGlass>
				<SymbolView
					name={SHARE_ICON}
					size={17}
					tintColor={coverInk}
					weight="semibold"
				/>
			</CoverGlass>
		</Pressable>
	);
}

/** Explainers end on a way to the crisis-resources screen — only where we have resources (#403). */
export function HelplineLink({ kind }: { kind: ReaderEntry["kind"] }) {
	const muted = useThemeColor("muted");
	if (kind !== "explainer" || !detectCountry()) {
		return null;
	}
	return (
		<Pressable
			accessibilityLabel="Need to talk to someone? Find support near you"
			accessibilityRole="link"
			className="mt-6 flex-row items-center gap-3 rounded-2xl bg-surface-secondary p-4 active:opacity-70"
			onPress={() => router.push("/crisis-resources?from=library")}
			style={{ borderCurve: "continuous" }}
		>
			<SymbolView name={HELP_ICON} size={16} tintColor={muted} />
			<AppText className="flex-1 font-semibold text-sm">
				Need to talk to someone? Find support near you
			</AppText>
			<SymbolView name={CHEVRON} size={13} tintColor={muted} />
		</Pressable>
	);
}

/**
 * "Read by the fire": the night page's warm dark laid over the whole reader,
 * whatever the Aa mode. Atmosphere only — narration is the audio. 30%, not
 * more: past that the dimmest light theme (nightly) drops body text below AA.
 */
export function FireDim() {
	const on = useAppStore((s) => s.readByFire);
	if (!on) {
		return null;
	}
	return (
		<View
			className="bg-reader-night-bg/30"
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
		/>
	);
}
