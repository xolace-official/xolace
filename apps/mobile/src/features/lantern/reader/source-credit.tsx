import { Linking, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { headerCredit } from "@/features/lantern/reader/reader-model";
import { useTokenColors } from "@/lib/use-token-color";

const XOLACE_LOGO = require("@/assets/images/icon.png");
const MARK = 36;
const ICON = {
	listen: { android: "headphones", ios: "headphones" },
	note: { android: "info", ios: "exclamationmark.circle" },
	pause: { android: "pause", ios: "pause.fill" },
	source: { android: "account_balance", ios: "building.columns" },
} as const;

/**
 * Who this is from, keyed on how it was reused (production's `SourceCredit`): Xolace's mark, or
 * the publisher's, which opens the original. The Listen pill sits on its right when there's audio.
 */
export function SourceCredit() {
	const { entry } = useReaderScreen().state;
	const [muted] = useTokenColors(["muted"]);
	const { name, line, href, logoUrl, xolace } = headerCredit(entry);
	return (
		<View className="mb-6 flex-row items-center gap-3">
			<Pressable
				accessibilityHint={href ? COPY.reader.sources.opens : undefined}
				accessibilityLabel={`${name}, ${line}`}
				accessibilityRole={href ? "link" : undefined}
				className="flex-1 flex-row items-center gap-3 active:opacity-70"
				disabled={!href}
				onPress={() => (href ? Linking.openURL(href) : undefined)}
			>
				<View
					className="items-center justify-center overflow-hidden rounded-full bg-surface-secondary"
					style={{ height: MARK, width: MARK }}
				>
					{xolace || logoUrl ? (
						<Image
							contentFit="cover"
							source={xolace ? XOLACE_LOGO : { uri: logoUrl }}
							style={{ height: MARK, width: MARK }}
						/>
					) : (
						<Icon color={muted} name={ICON.source} size={15} />
					)}
				</View>
				<View className="min-w-0 flex-1">
					<AppText
						className="text-[14px] leading-[18px]"
						variant="callout"
						weight="semibold"
					>
						{name}
					</AppText>
					<AppText
						className="text-[12px] leading-[16px]"
						color="muted"
						variant="caption"
					>
						{line}
					</AppText>
				</View>
			</Pressable>
			{entry.listenMin ? <ListenPill min={entry.listenMin} /> : null}
		</View>
	);
}

/** Production's `ListenPill`: starts the narration and, with it, the dock. */
function ListenPill({ min }: { min: number }) {
	const { state, actions } = useReaderScreen();
	const [ink] = useTokenColors(["foreground"]);
	const { started, playing } = state.audio;
	return (
		<PressScale
			accessibilityLabel={
				started
					? playing
						? COPY.reader.pause
						: COPY.reader.play
					: COPY.reader.listenLabel(min)
			}
			className="h-[38px] flex-row items-center gap-[7px] rounded-full bg-surface-secondary px-[15px]"
			onPress={actions.audio.toggle}
		>
			<Icon
				color={ink}
				name={playing ? ICON.pause : ICON.listen}
				size={14}
				weight="semibold"
			/>
			<AppText
				className="text-[14px] leading-[18px]"
				variant="callout"
				weight="semibold"
			>
				{started ? COPY.reader.playing : COPY.reader.listen(min)}
			</AppText>
		</PressScale>
	);
}

/** A curator's heads-up, before the body. */
export function ContentNote({ note }: { note: string }) {
	const [muted] = useTokenColors(["muted"]);
	return (
		<View
			accessibilityLabel={COPY.reader.contentNoteLabel(note)}
			accessible
			className="mb-6 flex-row gap-3 rounded-[16px] bg-surface-secondary p-4"
			style={{ borderCurve: "continuous" }}
		>
			<Icon color={muted} name={ICON.note} size={17} style={{ marginTop: 1 }} />
			<View className="flex-1 gap-1">
				<AppText
					className="text-[12px] uppercase leading-[15px] tracking-[1.44px]"
					color="muted"
					variant="caption"
					weight="semibold"
				>
					{COPY.reader.contentNote}
				</AppText>
				<AppText className="text-[14px] leading-[19.6px]" variant="callout">
					{note}
				</AppText>
			</View>
		</View>
	);
}
