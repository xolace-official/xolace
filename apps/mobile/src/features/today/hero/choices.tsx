import { type ComponentRef, type ReactNode, useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, type Text, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { EaseView } from "@/design/ease";
import { fadeUpProps } from "@/design/entering";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import type { Door as DoorId } from "../today-model";
import { CURVES } from "../today-motion";
import { Door } from "./door";
import { BURST, DOORS, HERO } from "./hero-model";

const FADE_DY = 6;
function FadeUp({ delay, children }: { delay: number; children: ReactNode }) {
	const { reduced } = useTodayFrame();
	return (
		<EaseView
			{...fadeUpProps(delay, BURST.fadeUpMs, FADE_DY, reduced, CURVES.css)}
		>
			{children}
		</EaseView>
	);
}

export function Choices({ onBack }: { onBack: () => void }) {
	const titleRef = useRef<ComponentRef<typeof Text>>(null);
	useEffect(() => {
		const id = setTimeout(() => {
			if (titleRef.current) {
				AccessibilityInfo.sendAccessibilityEvent(titleRef.current, "focus");
			}
		}, BURST.titleAt + BURST.fadeUpMs);
		return () => clearTimeout(id);
	}, []);
	const { actions } = useToday();
	const pick = (d: DoorId) => {
		Presets.System.selection();
		actions.openDoor(d);
	};
	return (
		<View
			className="absolute inset-0 gap-3 overflow-hidden px-4.5 pt-6 pb-3"
			onAccessibilityEscape={onBack}
			style={{ borderRadius: HERO.radius }}
		>
			<FadeUp delay={BURST.titleAt}>
				<AppText
					accessibilityRole="header"
					center
					className="tracking-[-0.44px]"
					ref={titleRef}
					variant="headlineL"
				>
					{COPY.doors.title}
				</AppText>
			</FadeUp>
			<View
				className="flex-1 flex-row gap-2.5"
				style={{ maxHeight: BURST.tileH, minHeight: BURST.tileMinH }}
			>
				{DOORS.map((d, i) => (
					<Door count={DOORS.length} id={d} index={i} key={d} onPick={pick} />
				))}
			</View>
			<FadeUp delay={BURST.backAt}>
				<Pressable
					accessibilityRole="button"
					className="self-center"
					hitSlop={10}
					onPress={onBack}
				>
					<AppText
						className="text-[13.5px] underline"
						color="muted"
						variant="footnote"
						weight="medium"
					>
						{COPY.doors.writeInstead}
					</AppText>
				</Pressable>
			</FadeUp>
		</View>
	);
}
