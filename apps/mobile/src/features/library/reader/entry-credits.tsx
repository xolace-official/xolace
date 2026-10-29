// After the body (#469): an adapted entry's "View sources" row and sheet;
// verbatim and original entries keep their licence lines.
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { SymbolView } from "expo-symbols";
import { BottomSheet, useThemeColor } from "heroui-native";
import { useState } from "react";
import {
	type LayoutChangeEvent,
	Linking,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";

import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";
import { useAppStore } from "@/store/store";
import { attributionLines } from "./reader-copy";
import { CHEVRON } from "./reader-extras";
import { ReaderPageScope } from "./reader-page";
import type { ReaderEntry } from "./reader-screen";
import { READING_MODES } from "./reading-mode";

const SOURCES_ICON = {
	android: "menu_book",
	ios: "books.vertical",
	web: "menu_book",
} as const;
const LINK_ICON = {
	android: "open_in_new",
	ios: "arrow.up.right",
	web: "open_in_new",
} as const;

type Source = ReaderEntry["sources"][number];

/** Straight after the body; `onLayout` marks the end of the article for the read signals. */
export function EntryCredits({
	entry,
	onLayout,
}: {
	entry: Pick<ReaderEntry, "reuse" | "sources">;
	onLayout: (e: LayoutChangeEvent) => void;
}) {
	const [open, setOpen] = useState(false);
	const muted = useThemeColor("muted");
	if (entry.reuse !== "adapted") {
		return (
			<AppText
				className="mt-8 border-separator border-t pt-4 text-muted text-xs"
				onLayout={onLayout}
			>
				{attributionLines(entry.sources).join("\n")}
			</AppText>
		);
	}
	const count = entry.sources.length;
	return (
		<View className="mt-8 border-separator border-t pt-2" onLayout={onLayout}>
			<Pressable
				accessibilityHint={`Lists the ${count} ${count === 1 ? "source" : "sources"} this was adapted from`}
				accessibilityLabel="View sources"
				accessibilityRole="button"
				className="flex-row items-center gap-3 py-3 active:opacity-60"
				onPress={() => setOpen(true)}
			>
				<SymbolView name={SOURCES_ICON} size={17} tintColor={muted} />
				<AppText className="flex-1 font-semibold text-sm">View sources</AppText>
				<SymbolView
					name={CHEVRON}
					size={13}
					tintColor={muted}
					weight="semibold"
				/>
			</Pressable>
			<SourcesSheet
				isOpen={open}
				onClose={() => setOpen(false)}
				sources={entry.sources}
			/>
		</View>
	);
}

function SourcesSheet({
	sources,
	isOpen,
	onClose,
}: {
	sources: Source[];
	isOpen: boolean;
	onClose: () => void;
}) {
	const { height } = useWindowDimensions();
	const page = READING_MODES[useAppStore((s) => s.readingMode)].page;
	return (
		<BottomSheet isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
			{/* Modal container: VoiceOver stays in the sheet. */}
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				{/* Inside the portal, which leaves the reader's tree and its scope. */}
				<ReaderPageScope page={page}>
					<BottomSheetBlurOverlay />
					<BottomSheet.Content
						// gorhom makes the sheet one accessible element, which hides its rows
						// and links.
						accessible={false}
						backgroundClassName="bg-background"
						enableDynamicSizing
						handleIndicatorClassName="bg-foreground/20"
					>
						{/* Header inside the scroller: dynamic sizing measures only its
						    content. */}
						<BottomSheetScrollView
							contentContainerStyle={{ paddingBottom: 48 }}
							style={{ maxHeight: height * 0.7 }}
						>
							<View className="px-6 pt-2 pb-4">
								<AppText
									accessibilityRole="header"
									className="font-bold text-foreground text-lg"
								>
									Sources adapted from
								</AppText>
								<AppText className="text-muted text-sm">
									For further reading
								</AppText>
							</View>
							{sources.map((s, i) => (
								<SourceRow key={i} source={s} />
							))}
							<AppText className="mx-6 mt-4 border-separator border-t pt-4 text-muted text-xs">
								{attributionLines(sources).join("\n")}
							</AppText>
						</BottomSheetScrollView>
					</BottomSheet.Content>
				</ReaderPageScope>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

/** publisher – page title · author; the title opens the page when there is one. */
function SourceRow({ source: s }: { source: Source }) {
	const href = s.pageUrl;
	const muted = useThemeColor("muted");
	return (
		<Pressable
			accessibilityHint={href ? "Opens the original page" : undefined}
			accessibilityLabel={[
				s.pageTitle,
				`from ${s.name}`,
				s.author && `by ${s.author}`,
			]
				.filter(Boolean)
				.join(", ")}
			accessibilityRole={href ? "link" : "text"}
			className="flex-row items-center gap-3 px-6 py-3 active:opacity-60"
			disabled={!href}
			onPress={() => href && Linking.openURL(href).catch(() => {})}
		>
			<AppText className="flex-1 text-foreground text-sm">
				<AppText className="font-semibold text-foreground text-sm">
					{s.name}
				</AppText>
				{" – "}
				<AppText
					className={
						href
							? "text-foreground text-sm underline"
							: "text-foreground text-sm"
					}
				>
					{s.pageTitle}
				</AppText>
				{s.author && (
					<AppText className="text-muted text-sm">{` · ${s.author}`}</AppText>
				)}
			</AppText>
			{href && (
				<SymbolView
					name={LINK_ICON}
					size={13}
					tintColor={muted}
					weight="semibold"
				/>
			)}
		</Pressable>
	);
}
