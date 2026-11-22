import { type ComponentProps, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GateFade } from "@/components/shared/gate-fade";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const GATE_H = 64;

export function WeekArrows({
	canPrev,
	canNext,
	onPage,
}: {
	canPrev: boolean;
	canNext: boolean;
	onPage: (by: -1 | 1) => void;
}) {
	return (
		<View className="ml-auto flex-row gap-1.5">
			<Arrow
				enabled={canPrev}
				label={COPY.week.prev}
				name={{ android: "chevron_left", ios: "chevron.left" }}
				onPress={() => onPage(-1)}
			/>
			<Arrow
				enabled={canNext}
				label={COPY.week.next}
				name={{ android: "chevron_right", ios: "chevron.right" }}
				onPress={() => onPage(1)}
			/>
		</View>
	);
}

function Arrow({
	label,
	name,
	enabled,
	onPress,
}: {
	label: string;
	name: ComponentProps<typeof Icon>["name"];
	enabled: boolean;
	onPress: () => void;
}) {
	const muted = useTokenColor("muted");
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled: !enabled }}
			className={cn(
				"size-7 items-center justify-center rounded-full bg-surface-secondary",
				enabled ? "opacity-100" : "opacity-40"
			)}
			disabled={!enabled}
			haptic={playSoftPress}
			hitSlop={6}
			onPress={onPress}
		>
			<Icon color={muted} name={name} size={13} weight="semibold" />
		</PressScale>
	);
}

export function EarlierWeeksGate({ onPress }: { onPress: () => void }) {
	const accent = useTokenColor("accent");
	const muted = useTokenColor("muted");
	const [width, setWidth] = useState(0);
	return (
		<Pressable
			accessibilityLabel={COPY.week.earlierLabel}
			accessibilityRole="button"
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			onPress={onPress}
			style={{ height: GATE_H }}
		>
			{width > 0 ? (
				<View className="absolute inset-0">
					<GateFade
						color={accent}
						endAlpha="42"
						height={GATE_H}
						width={width}
					/>
				</View>
			) : null}
			<View className="flex-1 flex-row items-center justify-center gap-2.5 opacity-50">
				<Icon
					color={muted}
					name={{ android: "chevron_left", ios: "chevron.left" }}
					size={11}
				/>
				<AppText
					className="text-[12px] tracking-[0.3px]"
					color="muted"
					variant="caption"
				>
					{COPY.week.earlier}
				</AppText>
				<Icon
					color={muted}
					name={{ android: "chevron_right", ios: "chevron.right" }}
					size={11}
				/>
			</View>
		</Pressable>
	);
}
