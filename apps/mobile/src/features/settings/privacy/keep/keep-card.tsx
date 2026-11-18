import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import {
	PRIVACY_COPY as C,
	PRIVACY_ICONS as I,
} from "@/features/settings/privacy/copy";
import type { keepCard } from "@/features/settings/privacy/privacy-model";
import { useTokenColors } from "@/lib/use-token-color";

const TILE_GLYPH = 13;

function Line({ icon, children }: { icon: IconName; children: string }) {
	const [accent] = useTokenColors(["accent"]);
	return (
		<View className="flex-row items-start gap-2.5">
			<View className="size-5.5 items-center justify-center rounded-[7px] border-continuous bg-accent/12">
				<Icon color={accent} name={icon} size={TILE_GLYPH} />
			</View>
			<AppText className="flex-1 text-[14.5px] leading-[21px]" variant="body">
				{children}
			</AppText>
		</View>
	);
}

/**
 * "What Xolace keeps" (board `.keep`): four plain lines that follow the choices below, and the
 * promise under a hairline. One VoiceOver element. The board's "46 kept" is left out: the backend
 * serves no count of kept sessions.
 */
export function KeepCard({ card }: { card: ReturnType<typeof keepCard> }) {
	const [shadow] = useTokenColors(["privacy-shadow"]);
	return (
		<View
			accessibilityLabel={card.a11y}
			accessible
			className="mx-4 rounded-[24px] border-[0.5px] border-continuous border-separator bg-surface px-4 pt-4 pb-3.5"
			style={{ boxShadow: `0px 14px 34px -26px ${shadow}` }}
		>
			<AppText
				className="text-[11px] text-foreground/48 leading-3.5 tracking-[1.21px]"
				variant="body"
				weight="bold"
			>
				{C.kicker.toUpperCase()}
			</AppText>
			<View className="mt-3.25 gap-2.25">
				<Line icon={I.sessions}>{card.sessions}</Line>
				<Line icon={I.memory}>{card.memory}</Line>
				<Line icon={I.share}>{card.share}</Line>
				<Line icon={I.never}>{card.never}</Line>
			</View>
			<View className="mt-3.25 border-separator border-t pt-2.75">
				<AppText
					className="text-[12px] text-foreground/48 leading-4"
					variant="body"
				>
					{C.footer}
				</AppText>
			</View>
		</View>
	);
}
