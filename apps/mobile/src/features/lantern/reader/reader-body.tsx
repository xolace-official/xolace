import { Linking } from "react-native";
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

// Callouts arrive as quotes led by their kind in bold (`prepareBody`), so the kind reads first.
const A11Y_LABELS = { blockquote: { quote: "Quote" } };

/** The body: the renderer handles headings, links, alt text, lists and quotes for screen readers. */
export function ReaderBody() {
	const { entry, prefs } = useReaderScreen().state;
	const style = useMarkdownStyle(prefs.mode, prefs.size, useReadingFonts());
	return (
		<EnrichedMarkdownText
			accessibilityLabels={A11Y_LABELS}
			flavor="github"
			markdown={prepareBody(entry.markdown)}
			markdownStyle={style}
			onLinkPress={({ url }) => Linking.openURL(url)}
		/>
	);
}

/**
 * Production's `ReaderTitle`: the first stop for a screen reader, with Back to top and, when
 * there's a place to go back to, Resume as actions. White on the cover; at accessibility sizes
 * it moves onto the page.
 */
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
