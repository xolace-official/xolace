import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { Ring } from "@/features/you/steadiness/parts/ring";
import { ViewFade } from "@/features/you/steadiness/parts/view-fade";
import type {
	Domain,
	PartView,
} from "@/features/you/steadiness/steadiness-model";
import { Surface } from "@/features/you/surface";
import { cn } from "@/lib/cn";

const THREE_UP = 3;

/** Production's grid: rings in three columns; the picked (or peeked) one sits on a tint. */
export function PartsGrid({
	parts,
	plus,
	current,
	onTap,
	clock,
	active,
}: {
	parts: PartView[];
	plus: boolean;
	current: Domain | null;
	onTap: (part: PartView) => void;
	clock: SharedValue<number>;
	active: boolean;
}) {
	return (
		<ViewFade active={active}>
			<Surface className="flex-row flex-wrap justify-between gap-y-4.5 p-4">
				{parts.map((part, i) => (
					<Cell
						clock={clock}
						index={i}
						key={part.domain}
						onTap={onTap}
						part={part}
						plus={plus}
						selected={current === part.domain}
					/>
				))}
				{/* Keep a short last row left-aligned under justify-between. */}
				{parts.length % THREE_UP === 2 ? <View className="w-[31%]" /> : null}
			</Surface>
		</ViewFade>
	);
}

function Cell({
	part,
	plus,
	selected,
	onTap,
	clock,
	index,
}: {
	part: PartView;
	plus: boolean;
	selected: boolean;
	onTap: (part: PartView) => void;
	clock: SharedValue<number>;
	index: number;
}) {
	const label =
		plus || part.warming
			? part.label
			: `${part.label}. ${COPY.steadinessScreen.peekGo}`;
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole={part.warming ? undefined : "button"}
			accessibilityState={{ selected }}
			className={cn(
				"w-[31%] items-center gap-1 rounded-[16px] border-continuous py-2",
				selected ? "bg-surface-secondary" : "bg-transparent"
			)}
			disabled={part.warming}
			onPress={() => onTap(part)}
			scaleTo={0.97}
		>
			<Ring clock={clock} index={index} part={part} />
			<AppText
				className="text-[11px] text-foreground/85 leading-3.5"
				numberOfLines={1}
				variant="caption"
			>
				{part.name}
			</AppText>
			{part.gridSub ? (
				<AppText
					className={cn(
						"-mt-0.5 text-[9px] leading-3",
						part.emberSub ? "text-ember" : "text-subtle"
					)}
					numberOfLines={1}
					variant="caption"
				>
					{part.gridSub}
				</AppText>
			) : null}
		</PressScale>
	);
}
