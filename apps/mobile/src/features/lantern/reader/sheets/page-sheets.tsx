import { Stack } from "expo-router";
import type { ReactNode } from "react";
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { COPY } from "@/features/lantern/copy";
import {
	attributionLines,
	type ReaderEntry,
} from "@/features/lantern/reader/reader-model";
import { ReaderPageScope } from "@/features/lantern/reader/reader-page";
import type { ReaderPage } from "@/features/lantern/reader/reading-modes";
import {
	useSources,
	useTranscript,
} from "@/features/lantern/reader/sheets/sheets-data";
import { useTokenColor } from "@/lib/use-token-color";

const LINK = { android: "open_in_new", ios: "arrow.up.right" } as const;
/** The sources sheet fits its content up to production's cap, then scrolls (large text, many
 * sources). */
const SOURCES_MAX = 0.7;

/** A sheet on the reading page, as production's are: its background follows the mode. */
function OnPage({
	page,
	fill = false,
	children,
}: {
	page: ReaderPage;
	/** A fixed-height sheet that scrolls (the transcript); the others fit their content. */
	fill?: boolean;
	children: ReactNode;
}) {
	return (
		<ReaderPageScope page={page}>
			<PageFill fill={fill}>{children}</PageFill>
		</ReaderPageScope>
	);
}

function PageFill({ fill, children }: { fill: boolean; children: ReactNode }) {
	// From the hook: the class misses the scoped page (#401).
	const bg = useTokenColor("background");
	return (
		<>
			<Stack.Screen options={{ contentStyle: { backgroundColor: bg } }} />
			<View
				accessibilityViewIsModal
				className={fill ? "flex-1" : undefined}
				style={{ backgroundColor: bg }}
			>
				{children}
			</View>
		</>
	);
}

/** View sources (production's `entry-credits.tsx`): what this was adapted from, then the licence. */
export function SourcesSheet() {
	const { state, actions } = useSources();
	const { page, sources } = state;
	const { height } = useWindowDimensions();
	return (
		<OnPage page={page}>
			<ScrollView
				contentContainerClassName="pt-7 pb-11"
				style={{ maxHeight: height * SOURCES_MAX }}
			>
				<View className="px-6 pt-0.5 pb-3.5">
					<AppText
						accessibilityRole="header"
						className="text-[18px] leading-[23px]"
						variant="body"
						weight="bold"
					>
						{COPY.reader.sources.title}
					</AppText>
					<AppText
						className="text-[14px] leading-[19px]"
						color="muted"
						variant="callout"
					>
						{COPY.reader.sources.further}
					</AppText>
				</View>
				{sources === undefined ? <ActivityIndicator className="py-6" /> : null}
				{sources?.map((s, i) => (
					<SourceRow
						key={`${s.name}-${i}`}
						onOpen={actions.openLink}
						source={s}
					/>
				))}
				{sources ? (
					<AppText
						className="mx-6 mt-2 border-separator border-t pt-3.5 text-[12px] leading-[18px]"
						color="muted"
						variant="caption"
					>
						{attributionLines(sources).join("\n")}
					</AppText>
				) : null}
			</ScrollView>
		</OnPage>
	);
}

/** "NHS – Insomnia · Author": the page title opens the page when there is one. */
function SourceRow({
	source: s,
	onOpen,
}: {
	source: ReaderEntry["sources"][number];
	onOpen: (url: string) => void;
}) {
	const muted = useTokenColor("muted");
	const href = s.pageUrl;
	return (
		<Pressable
			accessibilityHint={href ? COPY.reader.sources.opens : undefined}
			accessibilityLabel={[
				s.pageTitle,
				`from ${s.name}`,
				s.author && `by ${s.author}`,
			]
				.filter(Boolean)
				.join(", ")}
			accessibilityRole={href ? "link" : "text"}
			className="flex-row items-center gap-3 px-6 py-3 active:opacity-70"
			disabled={!href}
			onPress={() => (href ? onOpen(href) : undefined)}
		>
			<AppText
				className="flex-1 text-[14px] leading-[19.6px]"
				variant="callout"
			>
				<AppText className="text-[14px]" variant="callout" weight="bold">
					{s.name}
				</AppText>
				{" – "}
				<AppText
					className={href ? "text-[14px] underline" : "text-[14px]"}
					variant="callout"
				>
					{s.pageTitle}
				</AppText>
				{s.author ? (
					<AppText className="text-[14px]" color="muted" variant="callout">
						{` · ${s.author}`}
					</AppText>
				) : null}
			</AppText>
			{href ? (
				<Icon color={muted} name={LINK} size={12} weight="semibold" />
			) : null}
		</Pressable>
	);
}

/** The transcript (Xolace+, never in the preview): the narration as plain, selectable text. */
export function TranscriptSheet() {
	const { page, text } = useTranscript().state;
	return (
		<OnPage fill page={page}>
			<ScrollView contentContainerClassName="pt-7.5 pb-11">
				<AppText
					accessibilityRole="header"
					className="px-6 pb-3 text-[12px] uppercase leading-[15px] tracking-[1.44px]"
					color="muted"
					variant="caption"
				>
					{COPY.reader.transcript.title}
				</AppText>
				{text === undefined ? (
					<ActivityIndicator className="py-8" />
				) : (
					<AppText
						className="px-6 text-[16px] leading-[28px]"
						selectable
						variant="body"
					>
						{text ?? COPY.reader.transcript.none}
					</AppText>
				)}
			</ScrollView>
		</OnPage>
	);
}
