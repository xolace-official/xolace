import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { PaletteName } from "@/components/xolace-face/face-palette";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { FIRST_LOOK } from "../copy";
import { useFirstLookData } from "../first-look-data";

const FACE_SIZE = 78;
const HEADLINE_MAX_SCALE = 1.25;

type Props = { face: FaceHandle; palette: PaletteName };

export function FirstLookHeader({ face, palette }: Props) {
	const { said } = useFirstLookData().state;
	return (
		<>
			<View className="flex-row items-start justify-between gap-2.5 px-1">
				<View className="shrink gap-2 pt-1">
					<View
						accessibilityElementsHidden
						className="h-6 justify-center self-start rounded-full bg-ember-wash px-2.5"
						importantForAccessibility="no-hide-descendants"
					>
						<AppText color="emberInk" variant="caption" weight="semibold">
							{FIRST_LOOK.pill}
						</AppText>
					</View>
					<AppText
						accessibilityLabel={FIRST_LOOK.a11y.heading}
						accessibilityRole="header"
						maxFontSizeMultiplier={HEADLINE_MAX_SCALE}
						variant="title"
					>
						{FIRST_LOOK.headline}
					</AppText>
				</View>
				<View
					accessibilityElementsHidden
					className="mt-0.5"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
				>
					<XolaceFace face={face} palette={palette} size={FACE_SIZE} />
				</View>
			</View>
			<AppText className="mx-1 mt-2.5" color="muted" variant="callout">
				{said === null ? (
					FIRST_LOOK.plain
				) : (
					<>
						{FIRST_LOOK.said.before}
						<AppText variant="callout" weight="semibold">
							{said}
						</AppText>
						{FIRST_LOOK.said.after}
					</>
				)}
			</AppText>
		</>
	);
}
