import { useRouter } from "expo-router";
import { type SFSymbol, SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { AnimatedRow } from "@/features/idle-menu/animated-row";
import { GlowIcon } from "@/features/idle-menu/glow-icon";
import { playSoftPress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";

type MenuButtonItem = {
	label: string;
	iconName: { ios: SFSymbol; android: string };
	onPress: () => void;
	accessibilityLabel: string;
	/** Newly added item — icon glows until the item is opened once. */
	newKey?: string;
};

type Props = {
	isOpen: SharedValue<boolean>;
	onClose: () => void;
};

const ICON_DIM_STYLE = { opacity: 0.6 };

export const MenuButtons = ({ isOpen, onClose }: Props) => {
	const router = useRouter();
	const foregroundColor = useThemeColor("foreground");
	const accentColor = useThemeColor("accent");
	const containerHeight = useSharedValue(0);
	const seenMenuItems = useAppStore((s) => s.seenMenuItems);
	const markMenuItemSeen = useAppStore((s) => s.markMenuItemSeen);

	// Primary actions — what you came to do. Full rows.
	const primaryItems: MenuButtonItem[] = [
		{
			accessibilityLabel: "Open discovery",
			iconName: { android: "explore", ios: "safari" },
			label: "Discovery",
			newKey: "discovery",
			onPress: () => {
				onClose();
				// replace, not push — reflect stays the "/" landing with no back stack.
				// Cast until typedRoutes regenerates on next expo start (see /quotes).
				router.replace("/discovery" as any);
			},
		},
		{
			accessibilityLabel: "Open voice vent, speak your weight",
			iconName: { android: "mic", ios: "mic" },
			label: "Vent",
			newKey: "vent",
			onPress: () => {
				onClose();
				router.push("/(protected)/voice-vent");
			},
		},
	];

	// Housekeeping — shares one compact row.
	const compactItems: MenuButtonItem[] = [
		{
			accessibilityLabel: "Open settings",
			iconName: { android: "settings", ios: "gearshape" },
			label: "Settings",
			onPress: () => {
				onClose();
				router.push("/(protected)/settings");
			},
		},
	];

	const rowCount = primaryItems.length + 1;

	const isNew = (item: MenuButtonItem) =>
		!!item.newKey && !seenMenuItems.includes(item.newKey);

	const handlePress = (item: MenuButtonItem) => {
		playSoftPress();
		if (item.newKey) {
			markMenuItemSeen(item.newKey);
		}
		item.onPress();
	};

	const renderIcon = (item: MenuButtonItem, size: number) =>
		isNew(item) ? (
			<GlowIcon color={accentColor} name={item.iconName} size={size} />
		) : (
			<SymbolView
				name={item.iconName as any}
				size={size}
				style={ICON_DIM_STYLE}
				tintColor={foregroundColor}
			/>
		);

	const onContainerLayout = (e: {
		nativeEvent: { layout: { height: number } };
	}) => {
		containerHeight.set(e.nativeEvent.layout.height);
	};

	return (
		<View className="gap-1" onLayout={onContainerLayout}>
			{primaryItems.map((item, index) => (
				<AnimatedRow
					containerHeight={containerHeight}
					index={index}
					isOpen={isOpen}
					key={item.label}
					numberOfRows={rowCount}
				>
					<PressableFeedback
						accessibilityLabel={item.accessibilityLabel}
						accessibilityRole="menuitem"
						onPress={() => handlePress(item)}
					>
						<View className="flex-row items-center gap-4 rounded-2xl bg-surface px-6 py-4">
							{renderIcon(item, 22)}
							<AppText className="font-medium text-base text-foreground">
								{item.label}
							</AppText>
						</View>
					</PressableFeedback>
				</AnimatedRow>
			))}

			<AnimatedRow
				containerHeight={containerHeight}
				index={primaryItems.length}
				isOpen={isOpen}
				key="compact-row"
				numberOfRows={rowCount}
			>
				<View className="flex-row gap-1">
					{compactItems.map((item) => (
						<PressableFeedback
							accessibilityLabel={item.accessibilityLabel}
							accessibilityRole="menuitem"
							className="flex-1"
							key={item.label}
							onPress={() => handlePress(item)}
						>
							<View className="flex-row items-center gap-4 rounded-2xl bg-surface px-6 py-4">
								{renderIcon(item, 20)}
								<AppText
									className="font-medium text-foreground text-sm"
									numberOfLines={1}
								>
									{item.label}
								</AppText>
							</View>
						</PressableFeedback>
					))}
				</View>
			</AnimatedRow>
		</View>
	);
};
