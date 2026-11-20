import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { EaseView, FADE_IN, fadeTiming } from "@/design/ease";
import { useFixedFaces } from "@/design/fonts";
import { playSoftPress } from "@/lib/haptics";
import { RATE_COPY as C } from "../copy";
import { type Ember, SCENE_MOTION as M } from "./ember-scene";

const CLOSE = 44;
const CLOSE_GLYPH = 14;
const CLOSE_SLOP = 6;
/** Canvas: 58 pt from the top of the phone, 18 from the right. */
const CLOSE_TOP = -1;
const CLOSE_RIGHT = 18;

export function CloseButton({
	top,
	ember,
	onPress,
}: {
	top: number;
	ember: Ember;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={C.close}
			hitSlop={CLOSE_SLOP}
			onPress={onPress}
			style={{
				alignItems: "center",
				backgroundColor: ember["rate-close-fill"],
				borderColor: ember["rate-close-edge"],
				borderRadius: CLOSE / 2,
				borderWidth: 1,
				height: CLOSE,
				justifyContent: "center",
				position: "absolute",
				right: CLOSE_RIGHT,
				top: top + CLOSE_TOP,
				width: CLOSE,
			}}
		>
			<Icon
				color={ember["rate-cream"]}
				name={{ android: "close", ios: "xmark" }}
				size={CLOSE_GLYPH}
				weight="semibold"
			/>
		</PressScale>
	);
}

/** The fade a changed label or the thank-you line comes in on (the canvas's .25 s xl-fade). */
const SWAP = {
	animate: { opacity: 1 },
	initialAnimate: { opacity: 0 },
	transition: fadeTiming(M.fadeMs),
};

type FooterProps = {
	rated: boolean;
	reduced: boolean;
	ember: Ember;
	onTellUs: () => void;
	onRate: () => void;
	onWrite: () => void;
};

/** The thank-you line once rated, "Not quite right? Tell us", and the cream pill. */
export function RateFooter({
	rated,
	reduced,
	ember,
	onTellUs,
	onRate,
	onWrite,
}: FooterProps) {
	const faces = useFixedFaces("mirror");
	const fade = reduced ? FADE_IN : SWAP;
	const label = rated ? C.write : C.rate;
	const cream = { color: ember["rate-cream"] };
	return (
		<View className="items-stretch gap-1.5">
			{rated ? (
				<EaseView {...fade}>
					<AppText
						accessibilityLiveRegion="polite"
						center
						className={
							faces
								? "mb-1.5 font-mirror text-[18px] leading-[24px]"
								: "mb-1.5 text-[18px] leading-[24px]"
						}
						style={{ color: ember["rate-ink"] }}
						variant="body"
					>
						{C.thanks}
					</AppText>
				</EaseView>
			) : null}
			<Pressable
				accessibilityLabel={`${C.tellUsLead}${C.tellUs}`}
				accessibilityRole="button"
				className="h-11 items-center justify-center self-center px-3"
				onPress={onTellUs}
			>
				<AppText style={cream} variant="callout" weight="medium">
					{C.tellUsLead}
					<AppText
						className="underline"
						style={cream}
						variant="callout"
						weight="semibold"
					>
						{C.tellUs}
					</AppText>
				</AppText>
			</Pressable>
			<PressScale
				accessibilityHint={rated ? C.writeHint : undefined}
				accessibilityLabel={label}
				className="h-14 items-center justify-center rounded-full"
				haptic={playSoftPress}
				onPress={rated ? onWrite : onRate}
				style={{ backgroundColor: ember["rate-pill"] }}
			>
				<EaseView key={label} {...fade}>
					<AppText
						style={{ color: ember["rate-pill-ink"] }}
						variant="body"
						weight="semibold"
					>
						{label}
					</AppText>
				</EaseView>
			</PressScale>
		</View>
	);
}
