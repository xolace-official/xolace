import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/shared/app-text";
import { posthog } from "@/src/config/posthog";
import {
	type Intake,
	orderStarterRows,
} from "@/src/features/starter-suggestions/order-starter-rows";
import type { StarterRow } from "@/src/features/starter-suggestions/starter-rows";
import { playSoftPress } from "@/src/lib/haptics";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { cn } from "@/src/lib/utils";
import { useAppStore } from "@/src/store/store";

const FLUX = require("@/assets/images/flux/flux-map.png");
const FLUX_W = 72;
const FLUX_H = 96;
const FLUX_STYLE = { height: FLUX_H, width: FLUX_W };
// The tail sits over Flux's head; bubble and Flux share the same left edge.
const TAIL_LEFT = FLUX_W / 2 - 7;
// Per-tap token for /connect; module-level so the purity lint sees no render-time clock.
const navToken = () => String(Date.now());
const EASING = [0.23, 1, 0.32, 1] as [number, number, number, number];

type Props = {
	/** `getFullContext().intake`; null when intake was skipped. Orders the rows only (ADR-0017). */
	intake: Intake | null | undefined;
	onResolve: () => void;
};

/** Starter suggestions (#460): Flux, bottom-left, speaking a one-time offer of places to begin. */
export function StarterSuggestionsBubble({ intake, onResolve }: Props) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const reduceMotion = useEffectiveReducedMotion();
	const [muted, accent] = useThemeColor(["muted", "accent"]);
	const requestComposerOpen = useAppStore((s) => s.requestComposerOpen);

	// Mounted only while eligible, so ineligible users never fire anything (#463).
	const shownCaptured = useRef(false);
	useEffect(() => {
		if (shownCaptured.current) {
			return;
		}
		shownCaptured.current = true;
		posthog.capture("starter_suggestions_shown");
	}, []);

	// One resolve per showing, even if a second tap lands before the unmount.
	const resolved = useRef(false);
	const resolve = (event: string, props: Record<string, string | number>) => {
		if (resolved.current) {
			return false;
		}
		resolved.current = true;
		posthog.capture(event, props);
		onResolve();
		return true;
	};
	const dismiss = (via: "close" | "tap_away") =>
		resolve("starter_suggestions_dismissed", { via });

	const choose = (row: StarterRow, index: number) => {
		if (
			!resolve("starter_suggestion_tapped", {
				position: index + 1,
				row: row.id,
			})
		) {
			return;
		}
		playSoftPress();
		// Reflect is the screen under the bubble: ask it to open the card (#462).
		// Tab destinations replace, like the idle menu's Discovery, so reflect
		// stays the "/" landing with no back stack.
		if (row.id === "reflect") {
			requestComposerOpen();
		} else if (row.id === "vent") {
			router.push("/(protected)/voice-vent");
		} else if (row.id === "lantern") {
			router.replace("/browse/library", { withAnchor: true });
		} else if (row.id === "listen") {
			router.replace("/browse");
		}
		// The roster, not a conversation: the request (and its "Before you ask"
		// primer) stays the user's own tap. `t` re-applies the segment if the
		// tab is already mounted on Chats.
		else if (row.id === "xolacer") {
			router.replace({
				params: { t: navToken(), view: "xolacers" },
				pathname: "/connect",
			});
		}
	};

	const fluxBottom = insets.bottom + 16;

	return (
		<View
			accessibilityViewIsModal
			pointerEvents="box-none"
			style={StyleSheet.absoluteFill}
		>
			<EaseView
				animate={{ opacity: 1 }}
				initialAnimate={{ opacity: 0 }}
				style={StyleSheet.absoluteFill}
				transition={{ duration: reduceMotion ? 0 : 200, type: "timing" }}
			>
				<BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
				{/* Tap-away closes, same as ✕. Screen readers use ✕ instead. */}
				<Pressable
					accessible={false}
					onPress={() => dismiss("tap_away")}
					style={StyleSheet.absoluteFill}
				/>
			</EaseView>

			{/* Flux arrives first, then speaks. */}
			<EaseView
				animate={{ opacity: 1, translateY: 0 }}
				className="absolute left-5"
				initialAnimate={{ opacity: 0, translateY: reduceMotion ? 0 : 12 }}
				pointerEvents="none"
				style={{ bottom: fluxBottom }}
				transition={{
					duration: reduceMotion ? 150 : 280,
					easing: EASING,
					type: "timing",
				}}
			>
				<View className="absolute -inset-3 rounded-full bg-accent/15" />
				<Image
					accessible={false}
					contentFit="contain"
					source={FLUX}
					style={FLUX_STYLE}
				/>
			</EaseView>

			<EaseView
				animate={{ opacity: 1, scale: 1 }}
				className="absolute left-5 w-[76%] max-w-[320px]"
				initialAnimate={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
				style={{ bottom: fluxBottom + FLUX_H + 10 }}
				transformOrigin={{ x: 0.1, y: 1 }}
				transition={{
					delay: reduceMotion ? 0 : 140,
					duration: reduceMotion ? 150 : 260,
					easing: EASING,
					type: "timing",
				}}
			>
				<View className="rounded-3xl bg-surface pt-3 pb-1 shadow-lg">
					<View className="flex-row items-start pr-2 pl-4">
						<View accessibilityRole="header" className="flex-1 pt-1">
							<AppText className="font-semibold text-[15px] text-foreground">
								Where would you like to start?
							</AppText>
							<AppText className="text-muted text-xs">
								Suggested for you
							</AppText>
						</View>
						<PressableFeedback
							accessibilityLabel="Close suggestions"
							accessibilityRole="button"
							className="p-2"
							hitSlop={8}
							onPress={() => dismiss("close")}
						>
							<SymbolView
								name={{ android: "close", ios: "xmark" } as any}
								size={14}
								tintColor={muted}
							/>
						</PressableFeedback>
					</View>

					<View className="mt-1">
						{orderStarterRows(intake).map((row, i) => (
							<PressableFeedback
								accessibilityLabel={`${row.title}. ${row.subtitle}`}
								accessibilityRole="button"
								key={row.id}
								onPress={() => choose(row, i)}
							>
								<View
									className={cn(
										"mx-4 flex-row items-center gap-3 py-2.5",
										i > 0 && "border-border/50 border-t"
									)}
								>
									<View className="size-9 items-center justify-center rounded-xl bg-accent/10">
										<SymbolView
											name={row.icon as any}
											size={17}
											tintColor={accent}
										/>
									</View>
									<AppText
										className="flex-1 text-muted text-sm"
										numberOfLines={2}
									>
										<AppText className="font-semibold text-foreground text-sm">
											{row.title}
										</AppText>
										{`  ${row.subtitle}`}
									</AppText>
									<SymbolView
										name={
											{ android: "arrow_forward", ios: "arrow.right" } as any
										}
										size={13}
										tintColor={muted}
									/>
								</View>
							</PressableFeedback>
						))}
					</View>
				</View>

				{/* Speech tail, pointing down at Flux. */}
				<View
					className="absolute -bottom-1.5 size-3.5 rotate-45 rounded-sm bg-surface"
					style={{ left: TAIL_LEFT }}
				/>
			</EaseView>
		</View>
	);
}
