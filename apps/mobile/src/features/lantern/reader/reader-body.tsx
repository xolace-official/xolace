import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/lantern/copy";
import { useMarkdownStyle } from "@/features/lantern/reader/markdown-style";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import {
	metaLabel,
	metaLine,
	prepareBody,
} from "@/features/lantern/reader/reader-model";
import { useReadingFonts } from "@/features/lantern/reader/reading-modes";
import { cn } from "@/lib/cn";

const A11Y_LABELS = { blockquote: { quote: "Quote" } };

export function ReaderBody() {
	const { state, actions } = useReaderScreen();
	const { entry, prefs } = state;
	const style = useMarkdownStyle(prefs.mode, prefs.size, useReadingFonts());
	return (
		<EnrichedMarkdownText
			accessibilityLabels={A11Y_LABELS}
			flavor="github"
			markdown={prepareBody(entry.markdown)}
			markdownStyle={style}
			onLinkPress={({ url }) => actions.openLink(url)}
		/>
	);
}

export function ReaderTitle({
	onCover,
	onBackToTop,
	onResume,
}: {
	onCover: boolean;
	onBackToTop: () => void;
	onResume?: () => void;
}) {
	const { entry } = useReaderScreen().state;
	return (
		<>
			<AppText
				accessibilityActions={[
					{ label: COPY.reader.backToTop, name: "backToTop" },
					...(onResume ? [{ label: COPY.reader.resume, name: "resume" }] : []),
				]}
				accessibilityRole="header"
				className={cn(
					"text-[32px] leading-[37px] tracking-[-0.96px]",
					onCover && "text-cover-ink"
				)}
				onAccessibilityAction={(e) =>
					e.nativeEvent.actionName === "resume" ? onResume?.() : onBackToTop()
				}
				variant="display"
			>
				{entry.title}
			</AppText>
			<AppText
				accessibilityLabel={metaLabel(entry)}
				className={cn(
					"mt-2 text-[14px] leading-[18px]",
					onCover && "text-cover-ink/80"
				)}
				color="muted"
				variant="callout"
			>
				{metaLine(entry)}
			</AppText>
		</>
	);
}
