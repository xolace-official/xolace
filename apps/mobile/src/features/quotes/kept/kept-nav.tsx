import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { QuoteIcon } from "../chrome/quote-icons";
import { QUOTE_COPY } from "../copy";

export function KeptNav(p: {
	label: string;
	icon: "chevronLeft" | "chevronRight";
	disabled: boolean;
	ink: string;
	soft: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={p.label}
			accessibilityRole="button"
			accessibilityState={{ disabled: p.disabled }}
			className={cn(
				"size-11 items-center justify-center rounded-full",
				p.disabled ? "opacity-35" : "opacity-100"
			)}
			onPress={p.disabled ? undefined : p.onPress}
			style={{ backgroundColor: p.soft }}
		>
			<QuoteIcon color={p.ink} name={p.icon} size={18} stroke={2.3} />
		</PressScale>
	);
}

export function KeptHeader(p: {
	ink: string;
	soft: string;
	top: number;
	position: string;
	onBack: () => void;
}) {
	const onKept = { color: p.ink };
	return (
		<View
			className="absolute right-4 left-4 flex-row items-center gap-2.5"
			style={{ top: p.top }}
		>
			<PressScale
				accessibilityLabel={QUOTE_COPY.accessibility.back}
				accessibilityRole="button"
				className="size-11 items-center justify-center rounded-full"
				onPress={p.onBack}
				style={{ backgroundColor: p.soft }}
			>
				<QuoteIcon color={p.ink} name="chevronLeft" size={18} />
			</PressScale>
			<AppText
				accessibilityRole="header"
				center
				className="flex-1 text-[17px]"
				style={onKept}
				variant="headline"
				weight="semibold"
			>
				{QUOTE_COPY.wordsKept}
			</AppText>
			<AppText
				className="w-11 text-right text-[13px] opacity-75"
				style={onKept}
				variant="footnote"
				weight="semibold"
			>
				{p.position}
			</AppText>
		</View>
	);
}
