import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Link } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import { COVER_SCRIM } from "@/features/lantern/cover-palette";
import { type ReaderFrom, readerHref } from "@/features/lantern/lantern-links";
import { type CardItem, readTimeLine } from "@/features/lantern/lantern-model";
import { AX_FONT_SCALE, LS } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const C = LS.card;
const TITLE_LINES = 3;
const GLASS = isLiquidGlassAvailable();
const PLAY = { android: "play_arrow", ios: "play.fill" } as const;
const SHARE = "square.and.arrow.up";

export type PhotoEntry = Pick<
	CardItem,
	| "_id"
	| "slug"
	| "title"
	| "readMin"
	| "coverUrl"
	| "coverThumbhash"
	| "listenMin"
> & { views?: number };

type Props = {
	entry: PhotoEntry;
	kicker: string;
	width: number;
	height: number;
	from: ReaderFrom;
	onShare: (entry: PhotoEntry) => void;
	hub?: string;
	meta?: string;
	progress?: number;
	label?: string;
};

export function PhotoCard({
	entry,
	kicker,
	width,
	height,
	from,
	onShare,
	hub,
	meta: metaOverride,
	progress,
	label,
}: Props) {
	const reduced = useEffectiveReducedMotion();
	const ax = useWindowDimensions().fontScale >= AX_FONT_SCALE;
	const meta = metaOverride ?? readTimeLine(entry.readMin, entry.views);
	const size = { borderRadius: C.r, height, width };
	return (
		<View style={{ height, width }}>
			<Link asChild href={readerHref(entry.slug, from, hub)}>
				<Link.Trigger withAppleZoom={!reduced}>
					<PressScale
						accessibilityLabel={label ?? `${entry.title}. ${kicker}. ${meta}`}
						accessibilityRole="link"
						card
						className="overflow-hidden bg-cover-scrim"
						style={{ ...size, borderCurve: "continuous" }}
					>
						<CoverImage
							style={StyleSheet.absoluteFill}
							thumbhash={entry.coverThumbhash}
							transition={200}
							uri={entry.coverUrl}
						/>
						<LinearGradient
							className="absolute inset-0"
							colors={COVER_SCRIM.colors}
							locations={COVER_SCRIM.locations}
						/>
						<View
							className="flex-1 justify-end"
							style={{ gap: C.gap, padding: C.pad }}
						>
							<AppText
								className="text-[12px] text-cover-ink/72 uppercase leading-[15px] tracking-[1.5px]"
								variant="caption"
								weight="medium"
							>
								{kicker}
							</AppText>
							<AppText
								className="text-[24px] text-cover-ink leading-[27.6px] tracking-[-0.48px]"
								numberOfLines={ax ? undefined : TITLE_LINES}
								variant="headlineL"
							>
								{entry.title}
							</AppText>
							<AppText
								className="text-[13px] text-cover-ink/78 leading-[17px]"
								variant="footnote"
							>
								{meta}
							</AppText>
							{progress === undefined ? null : <ReadBar share={progress} />}
						</View>
					</PressScale>
				</Link.Trigger>
				<Link.Preview />
				<Link.Menu>
					<Link.MenuAction icon={SHARE} onPress={() => onShare(entry)}>
						{COPY.row.share}
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			{entry.listenMin === undefined ? null : <HasAudio />}
		</View>
	);
}

function ReadBar({ share }: { share: number }) {
	return (
		<View
			className="mt-0.5 overflow-hidden rounded-[2px] bg-cover-ink/30"
			style={{ height: C.bar }}
		>
			<View
				className="h-full rounded-[2px] bg-cover-ink"
				style={{ width: `${share * 100}%` }}
			/>
		</View>
	);
}

function HasAudio() {
	const ink = useTokenColor("cover-ink");
	const round = { borderRadius: C.mark / 2, height: C.mark, width: C.mark };
	const glyph = <Icon color={ink} name={PLAY} size={13} />;
	return (
		<View
			accessibilityElementsHidden
			className={
				GLASS
					? "absolute items-center justify-center"
					: "absolute items-center justify-center bg-cover-scrim/30"
			}
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ ...round, right: C.markInset, top: C.markInset }}
		>
			{GLASS ? (
				<GlassView
					colorScheme="dark"
					glassEffectStyle="clear"
					style={{ ...round, alignItems: "center", justifyContent: "center" }}
				>
					{glyph}
				</GlassView>
			) : (
				glyph
			)}
		</View>
	);
}
