import type { ReactNode } from "react";
import { View } from "react-native";
import { BlurView } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import type { InkPalette } from "./quote-ink";

const GLASS_BLUR = 20;

export function QuoteGlass({
	ink,
	className,
	children,
}: {
	ink: InkPalette;
	className?: string;
	children?: ReactNode;
}) {
	return (
		<View className={cn("overflow-hidden border-continuous", className)}>
			<BlurView
				className="absolute inset-0"
				intensity={GLASS_BLUR}
				tint="default"
			/>
			<View
				className="absolute inset-0 rounded-full border-[0.5px]"
				pointerEvents="none"
				style={{ backgroundColor: ink.glass, borderColor: ink.glassLine }}
			/>
			{children}
		</View>
	);
}
