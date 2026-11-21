import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { BadgeArt } from "@/components/shared/badge-art";
import { Image } from "@/components/shared/styled";
import { FIXED_FACES } from "@/design/font-pairs";
import { COPY } from "@/features/achievements/copy";
import { FAMILY, M } from "@/features/achievements/share/badge-card-look";
import {
	CARD,
	type BadgeCard as Card,
} from "@/features/achievements/share/badge-card-model";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const LOCKUP = require("@/assets/images/brand/logo-lockup.webp");
const LOCKUP_RATIO = 536 / 200;
const HEADLINE_LINES = 4;

type Props = {
	card: Card;
	scale: number;
	onArtLoad?: () => void;
	ref?: Ref<ComponentRef<typeof View>>;
};

export function BadgeCard({ card, scale: f, onArtLoad, ref }: Props) {
	const ink = useTokenColor("badge-card-ink");
	const family = FAMILY[card.family];
	const at = (n: number) => n * f;
	const face = (
		font: keyof typeof FIXED_FACES,
		t: { size: number; lh: number }
	) => ({
		fontFamily: FIXED_FACES[font],
		fontSize: at(t.size),
		lineHeight: at(t.lh),
	});
	return (
		<View
			accessibilityLabel={card.label}
			accessibilityRole="image"
			accessible
			className={cn("overflow-hidden", family.ground)}
			collapsable={false}
			ref={ref}
			style={{ height: at(CARD.height), width: at(CARD.width) }}
		>
			<View
				className="absolute"
				style={{ right: at(M.art.right), top: at(M.art.top) }}
			>
				<BadgeArt
					instant
					lit
					onLoad={onArtLoad}
					size={at(M.art.size)}
					source={card.art.source}
					thumbhash={card.art.thumbhash}
				/>
			</View>
			<Image
				className="absolute"
				contentFit="contain"
				source={LOCKUP}
				style={{
					height: at(M.mark.h),
					left: at(M.mark.left),
					top: at(M.mark.top),
					width: at(M.mark.h * LOCKUP_RATIO),
				}}
				tintColor={ink}
			/>
			<View
				className="absolute"
				style={{
					bottom: at(M.padBottom),
					gap: at(M.gap),
					left: at(M.pad),
					right: at(M.pad),
				}}
			>
				{card.name ? (
					<AppText
						allowFontScaling={false}
						className={family.ink}
						numberOfLines={1}
						style={face("poster-semi", M.name)}
						variant="poster"
					>
						{card.name}
					</AppText>
				) : null}
				<AppText
					allowFontScaling={false}
					className="text-badge-card-ink"
					numberOfLines={HEADLINE_LINES}
					style={face("poster", M.line)}
					variant="poster"
				>
					{COPY.card.before}
					<AppText
						allowFontScaling={false}
						className={family.ink}
						style={face("poster", M.line)}
						variant="poster"
					>
						{card.title}
					</AppText>
					{COPY.card.after}
				</AppText>
				<View
					className="flex-row items-center justify-between"
					style={{ gap: at(M.foot.gap), marginTop: at(M.gap) }}
				>
					<AppText
						allowFontScaling={false}
						className="shrink text-badge-card-muted"
						numberOfLines={1}
						style={face("poster-medium", M.foot)}
						variant="poster"
					>
						{card.date}
					</AppText>
					<AppText
						allowFontScaling={false}
						className="text-badge-card-muted"
						style={{ ...face("poster-semi", M.foot), letterSpacing: at(0.2) }}
						variant="poster"
					>
						{COPY.card.site}
					</AppText>
				</View>
			</View>
		</View>
	);
}
