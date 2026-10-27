import { Surface } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { CardInfo } from "./card-info";

const WORDS_INFO =
	"These are the recurring words from your own writing; your language, not ours. They surface here once a few have started to return.";

type Props = {
	staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

// Honest placeholder for users without enough distinct language yet.
// No fabricated words, no blur — just the promise of what will surface.
export function WordsTeaserEmpty({ staggerDelay = 360 }: Props) {
	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className="mx-5"
			initialAnimate={{ opacity: 0, translateY: 8 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			<Surface className="p-0">
				<View className="flex-row items-center gap-1.5 px-5 pt-5 pb-3">
					<AppText className="font-medium text-[11px] text-muted uppercase tracking-widest">
						Words that keep finding you
					</AppText>
					<CardInfo
						description={WORDS_INFO}
						title="Words that keep finding you"
					/>
				</View>

				<View className="px-5 pb-6">
					<AppText className="text-foreground/70 text-sm">
						Your words will surface here as you keep writing.
					</AppText>
					<AppText className="mt-1.5 text-[11px] text-muted/70 tracking-wide">
						The ones that keep returning rise to the top.
					</AppText>
				</View>
			</Surface>
		</EaseView>
	);
}
