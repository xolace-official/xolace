import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LETTERS } from "../copy";
import { EmberSeal } from "../ember-seal";
import { Fade } from "../fade";
import { FoldedLetter } from "../folded-letter";
import type { WriteLimit } from "../letters-model";
import { backToLetters } from "../letters-routes";

const SEAL = { below: -11, size: 22 };

export function LimitView({
	which,
	reduced,
}: {
	which: WriteLimit;
	reduced: boolean;
}) {
	return (
		<Fade
			appear
			className="flex-1 items-center justify-center gap-5 px-8 pb-24"
			on
			reduced={reduced}
		>
			<View
				accessibilityElementsHidden
				className="mb-1.5"
				importantForAccessibility="no-hide-descendants"
			>
				<FoldedLetter sealed={false} size="card" />
				<View
					className="absolute right-0 left-0 items-center opacity-35"
					style={{ bottom: SEAL.below }}
				>
					<EmberSeal size={SEAL.size} />
				</View>
			</View>
			<AppText className="text-center" color="muted" variant="body">
				{LETTERS.limit[which]}
			</AppText>
			<PressScale
				accessibilityRole="button"
				className="min-h-[50px] items-center justify-center rounded-full bg-foreground px-[22px]"
				onPress={backToLetters}
			>
				<AppText color="background" variant="body" weight="semibold">
					{LETTERS.sent.seeLetters}
				</AppText>
			</PressScale>
		</Fade>
	);
}
