import { router } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";

const MIN_BOTTOM = 22;

export function SheetChrome({
	title,
	sub,
	children,
}: {
	title: string;
	sub: string;
	children: ReactNode;
}) {
	const foreground = useTokenColor("foreground");
	const insets = useSafeAreaInsets();
	return (
		<View
			className="px-5.5 pt-5.5"
			style={{ paddingBottom: Math.max(insets.bottom, MIN_BOTTOM) }}
		>
			<PressScale
				accessibilityLabel={TALK_COPY.style.close}
				className="absolute top-5.5 left-4 z-1 size-8.5 items-center justify-center rounded-full bg-surface-secondary"
				onPress={() => router.back()}
			>
				<Icon
					color={foreground}
					name={{ android: "close", ios: "xmark" }}
					size={14}
					weight="semibold"
				/>
			</PressScale>
			<AppText
				accessibilityRole="header"
				center
				className="my-1 text-[17px] leading-[22px]"
				variant="body"
				weight="semibold"
			>
				{title}
			</AppText>
			<AppText center className="mb-4.5" color="subtle" variant="footnote">
				{sub}
			</AppText>
			{children}
		</View>
	);
}

export function SheetDone({ label }: { label: string }) {
	return (
		<PressScale
			className="h-12.5 items-center justify-center rounded-full bg-foreground"
			onPress={() => router.back()}
		>
			<AppText
				className="text-[16px] leading-[21px]"
				color="background"
				variant="subhead"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}
