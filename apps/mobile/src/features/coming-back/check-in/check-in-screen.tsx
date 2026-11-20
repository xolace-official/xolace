import { router, useNavigation } from "expo-router";
import {
	type ComponentRef,
	type ReactNode,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import {
	KeyboardAvoidingView,
	type LayoutChangeEvent,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { useCheckIn } from "../check-in-data";
import type { WaitingCard } from "../coming-back-model";
import type { CheckInPick } from "../copy";
import { CheckInCards } from "./check-in-cards";
import { CheckInHead } from "./check-in-head";
import { PANEL_MAX, usePanelRise } from "./panel-rise";
import { PlacesStep } from "./places-step";
import { ReflectiveStep } from "./reflective-step";

const PANEL_BOTTOM = 26;
const SHEET = "rounded-t-[34px] border-continuous bg-surface";
const PAD = "gap-3 px-5 pt-5.5";
const SHEET_SHADOW = {
	shadowOffset: { height: -10, width: 0 },
	shadowOpacity: 0.3,
	shadowRadius: 15,
} as const;

type Props = {
	offer?: (answer: CheckInPick, card: WaitingCard) => ReactNode;
};

export function CheckInScreen({ offer }: Props) {
	const { state, actions } = useCheckIn();
	const { reduced, picked } = state;
	const dark = useScheme() === "dark";
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const navigation = useNavigation();
	const shadow = useTokenColor("check-in-shadow");
	const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
	const [pageH, setPageH] = useState(0);
	const [headH, setHeadH] = useState(0);
	const [stepH, setStepH] = useState<number | null>(null);

	const missing = state.card === null;
	useEffect(() => {
		if (missing) {
			router.back();
		}
	}, [missing]);

	const leaving = useEffectEvent(actions.leaving);
	useEffect(() => {
		// Native stack's own event (not in the generic navigation's event map).
		const off = navigation.addListener(
			"transitionStart" as never,
			(e: { data?: { closing?: boolean } }) => {
				if (e.data?.closing) {
					leaving();
				}
			}
		);
		return () => {
			off();
			leaving();
		};
	}, [navigation]);

	const step = picked && picked !== "vent" ? picked : null;
	const toTop = () => scroll.current?.scrollTo({ animated: !reduced, y: 0 });

	const panelStyle = usePanelRise(step !== null, reduced, height);

	// KeyboardAvoidingView measures from its parent: it's told where the page sheet starts.
	const sheetY = pageH > 0 ? Math.max(0, height - pageH) : 0;
	const flow =
		step !== null && stepH !== null && pageH > 0 && headH + stepH > pageH;
	const card = state.card;
	let content: ReactNode = null;
	if (card && step) {
		const slot = offer?.(step, card);
		content =
			step === "lighter" || step === "processed" ? (
				<ReflectiveStep answer={step} offer={slot} />
			) : (
				<PlacesStep answer={step} offer={slot} />
			);
	}
	const pad = { paddingBottom: Math.max(PANEL_BOTTOM, insets.bottom) } as const;
	const sheet = { shadowColor: shadow, ...SHEET_SHADOW } as const;

	if (missing) {
		return null;
	}
	return (
		<KeyboardAvoidingView
			behavior="padding"
			className={cn("flex-1", dark ? "bg-background" : "bg-check-in-paper")}
			keyboardVerticalOffset={sheetY}
			onLayout={(e: LayoutChangeEvent) => setPageH(e.nativeEvent.layout.height)}
		>
			<ScrollView
				bounces={false}
				contentContainerClassName="grow"
				keyboardShouldPersistTaps="handled"
				ref={scroll}
				scrollEnabled={!step || flow}
				showsVerticalScrollIndicator={false}
			>
				<View
					onLayout={(e: LayoutChangeEvent) =>
						setHeadH(e.nativeEvent.layout.height)
					}
				>
					<CheckInHead />
				</View>
				<View className="flex-1" />
				<View className={cn(flow && "absolute inset-x-0 bottom-0")}>
					<CheckInCards onPicked={toTop} />
				</View>
				{flow ? (
					<Animated.View
						className={cn("mt-2", SHEET, PAD)}
						style={[sheet, pad, panelStyle]}
					>
						{content}
					</Animated.View>
				) : null}
			</ScrollView>
			{step && !flow ? (
				<Animated.View
					className={cn("absolute inset-x-0 bottom-0", SHEET)}
					style={[{ maxHeight: height * PANEL_MAX }, sheet, panelStyle]}
				>
					<ScrollView
						bounces={false}
						className="shrink"
						contentContainerClassName={PAD}
						contentContainerStyle={pad}
						keyboardShouldPersistTaps="handled"
						onContentSizeChange={(_w, h) => setStepH((v) => v ?? h)}
					>
						{content}
					</ScrollView>
				</Animated.View>
			) : null}
		</KeyboardAvoidingView>
	);
}
