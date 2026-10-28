import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tour } from "@/components/ui/tour";
import { useMenuState } from "@/features/idle-menu/hooks/use-menu-state";
import { MenuButtonsWrapper } from "@/features/idle-menu/menu-buttons-wrapper";
import { MenuTrigger } from "@/features/idle-menu/menu-trigger";
import { TOUR_STEPS } from "@/features/reflect-tour/tour-copy";
import { useAppStore } from "@/store/store";

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
	// buttons; the cleanup covers an unmount mid-open.
	const setIdleMenuOpen = useAppStore((s) => s.setIdleMenuOpen);
	useEffect(() => {
		setIdleMenuOpen(isOpenJS);
		return () => setIdleMenuOpen(false);
	}, [isOpenJS, setIdleMenuOpen]);
	const absoluteFillStyle = StyleSheet.absoluteFill;
	// The host screen pads its root by the top inset, so reach back over that
	// padding to dim the whole window.
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
				{/* Last step of the reflect tour; see TOUR_STEPS for the ordering. */}
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
