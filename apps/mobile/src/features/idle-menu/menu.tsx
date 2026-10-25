import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tour } from "@/src/components/ui/tour";
import { useMenuState } from "@/src/features/idle-menu/hooks/use-menu-state";
import { MenuButtonsWrapper } from "@/src/features/idle-menu/menu-buttons-wrapper";
import { MenuTrigger } from "@/src/features/idle-menu/menu-trigger";
import { TOUR_STEPS } from "@/src/features/reflect/tour-copy";
import { useAppStore } from "@/src/store/store";

const EASE_INITIAL = { opacity: 0 };
const EASE_ANIMATE = { opacity: 1 };
const EASE_TRANSITION = {
	duration: 150,
	easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
	type: "timing" as const,
};

export const IdleMenu = () => {
	const { isOpen, isOpenJS, toggle, close } = useMenuState();
	// Publish the scrim's lifetime so the reflect screen can lower its header
	// buttons, which sit above anything this screen draws. The cleanup covers
	// an unmount mid-open, which would otherwise strand the header hidden.
	const setIdleMenuOpen = useAppStore((s) => s.setIdleMenuOpen);
	useEffect(() => {
		setIdleMenuOpen(isOpenJS);
		return () => setIdleMenuOpen(false);
	}, [isOpenJS, setIdleMenuOpen]);
	const absoluteFillStyle = StyleSheet.absoluteFill;
	// The host screen pads its root by the top inset, so an absoluteFill here
	// stops short of the status bar. Reach back over that padding: the scrim
	// dims the whole window, the way a scrim should.
	const insets = useSafeAreaInsets();
	const scrimStyle = {
		bottom: 0,
		left: 0,
		position: "absolute" as const,
		right: 0,
		top: -insets.top,
	};

	return (
		<View pointerEvents="box-none" style={absoluteFillStyle}>
			{isOpenJS && (
				<EaseView
					animate={EASE_ANIMATE}
					initialAnimate={EASE_INITIAL}
					pointerEvents="auto"
					style={scrimStyle}
					transition={EASE_TRANSITION}
				>
					<BlurView intensity={20} style={absoluteFillStyle} tint="dark" />
					<Pressable
						accessible={false}
						onPress={close}
						style={absoluteFillStyle}
					/>
				</EaseView>
			)}
			<View pointerEvents="box-none" style={styles.menuAnchor}>
				<MenuButtonsWrapper
					isOpen={isOpen}
					isOpenJS={isOpenJS}
					onClose={close}
				/>
				{/* Last step of the reflect tour. The trigger is a plain view, unlike
            the profile and crisis controls in the header, so it can simply be
            wrapped — see TOUR_STEPS for the ordering. */}
				<Tour.Step
					description={TOUR_STEPS[5].description}
					order={5}
					shape="circle"
					title={TOUR_STEPS[5].title}
				>
					<MenuTrigger isOpen={isOpen} isOpenJS={isOpenJS} onPress={toggle} />
				</Tour.Step>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	menuAnchor: {
		alignItems: "flex-end",
		bottom: 72,
		position: "absolute",
		right: 24,
	},
});
