import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";

type Props = {
	tags: string[];
	staggerDelay?: number;
};

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

export function EmotionChips({ tags, staggerDelay = 180 }: Props) {
	if (tags.length === 0) {
		return null;
	}

	const visible = tags.slice(0, 3);

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			initialAnimate={{ opacity: 0, translateY: 6 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			<View className="mt-8 px-5">
				<AppText className="mb-3.5 text-[11px] text-muted uppercase tracking-widest">
					what keeps showing up
				</AppText>
				<View className="flex-row flex-wrap gap-2.5">
					{visible.map((tag) => (
						<View
							className="rounded-full border border-resonance-foreground/20 bg-resonance px-4 py-2"
							key={tag}
						>
							<AppText className="text-[15px] text-resonance-foreground lowercase">
								{tag}
							</AppText>
						</View>
					))}
				</View>
			</View>
		</EaseView>
	);
}
