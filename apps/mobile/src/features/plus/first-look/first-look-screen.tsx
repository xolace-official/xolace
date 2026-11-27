import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import type { RowId } from "./copy";
import { useFirstLookData } from "./first-look-data";
import { SCROLL_AFTER_MS, unit } from "./first-look-motion";
import { FirstLookFooter } from "./footer/first-look-footer";
import { FirstLookHeader } from "./header/first-look-header";
import { FirstLookTable } from "./table/first-look-table";
import { type SceneHold, useFirstLookScene } from "./use-first-look-scene";
import { useRowScroll } from "./use-row-scroll";

const CLIP_ROOM = 8;
const FADE_H = 10;

export function FirstLookScreen({ hold }: { hold?: SceneHold }) {
	const { actions, state } = useFirstLookData();
	const reduced = useEffectiveReducedMotion();
	const insets = useSafeAreaInsets();
	const scene = useFirstLookScene(hold, reduced);
	const scroll = useRowScroll(reduced);

	const onToggle = (id: RowId) => {
		if (state.buying) {
			return;
		}
		const { next, prev } = scene.toggle(id);
		if (next) {
			actions.rowOpened(next);
			scene.later(SCROLL_AFTER_MS, () => scroll.toRow(next, prev));
		}
	};

	const top = insets.top - 2 - CLIP_ROOM;
	return (
		<View
			className="flex-1 bg-background"
			pointerEvents={state.buying ? "none" : "auto"}
		>
			<Animated.ScrollView
				className="flex-1"
				contentContainerClassName="px-4 pb-3.5"
				contentContainerStyle={{ paddingTop: CLIP_ROOM }}
				onContentSizeChange={scroll.onContentSizeChange}
				onLayout={scroll.onLayout}
				onScroll={scroll.onScroll}
				ref={scroll.ref}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
				style={{ marginTop: top }}
			>
				<FirstLookHeader face={scene.face} palette={scene.palette} />
				<FirstLookTable
					clock={scene.clock}
					focused={scene.focused}
					mounted={scene.mounted}
					onHeight={scroll.onHeight}
					onToggle={onToggle}
					onVoice={scene.pickVoice}
					open={scene.open}
					reduced={reduced}
					voice={scene.voice}
				/>
			</Animated.ScrollView>
			<TopFade scrollY={scroll.scrollY} top={top} />
			<FirstLookFooter reduced={reduced} />
		</View>
	);
}

function TopFade({
	scrollY,
	top,
}: {
	scrollY: ReturnType<typeof useRowScroll>["scrollY"];
	top: number;
}) {
	const background = useTokenColor("background");
	const style = useAnimatedStyle(() => ({
		opacity: unit(scrollY.get() / FADE_H),
	}));
	return (
		<Animated.View
			className="absolute inset-x-0"
			pointerEvents="none"
			style={[{ height: FADE_H, top }, style]}
		>
			<LinearGradient
				className="flex-1"
				colors={[background, clearOf(background)]}
			/>
		</Animated.View>
	);
}
