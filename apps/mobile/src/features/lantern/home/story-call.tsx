import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import { LS } from "@/features/lantern/lantern-style";
import { useTokenColors } from "@/lib/use-token-color";

const WHISPER = require("@/assets/images/flux/flux-whisper.png");
const ENVELOPE = { android: "mail", ios: "envelope" } as const;
const ART = { h: 72, w: 40 } as const;

/**
 * "Share your light": a quiet call for stories, at the foot of Lantern home and the Stories
 * list. Drawn like the kind rows; only its button acts, through the screen's provider.
 */
export function StoryCall({ onWrite }: { onWrite: () => void }) {
	const [separator, ink] = useTokenColors(["separator", "foreground"]);
	const copy = COPY.storyCall;
	return (
		<View style={{ paddingHorizontal: LS.gutter, paddingTop: LS.sectionTop }}>
			<View
				className="gap-3 bg-surface px-5 pt-4 pb-5"
				style={{
					borderCurve: "continuous",
					borderRadius: LS.kind.r,
					boxShadow: `0px 0px 0px 1px ${separator}`,
				}}
			>
				<View className="flex-row items-center gap-4">
					<View className="flex-1 gap-1">
						<AppText
							className="text-[12px] leading-[16px] tracking-[0.4px]"
							color="muted"
							variant="caption"
							weight="semibold"
						>
							{copy.kicker}
						</AppText>
						<AppText
							accessibilityRole="header"
							className="text-[17px] leading-[22px]"
							variant="body"
							weight="semibold"
						>
							{copy.title}
						</AppText>
					</View>
					<Image
						contentFit="contain"
						source={WHISPER}
						style={{ height: ART.h, width: ART.w }}
					/>
				</View>
				<AppText
					className="text-[14px] leading-[19px]"
					color="muted"
					variant="callout"
				>
					{copy.line}
				</AppText>
				<PressScale
					accessibilityLabel={copy.buttonLabel(copy.email)}
					accessibilityRole="button"
					className="mt-1 h-[38px] flex-row items-center gap-1.5 self-start rounded-full bg-surface-secondary px-4"
					onPress={onWrite}
				>
					<Icon color={ink} name={ENVELOPE} size={14} weight="semibold" />
					<AppText
						className="text-[14px] leading-[18px]"
						variant="callout"
						weight="semibold"
					>
						{copy.button}
					</AppText>
				</PressScale>
			</View>
		</View>
	);
}
