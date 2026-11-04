// The Xolace+ step's Free / With Plus switch (#713): ember under Plus, quiet under Free.
import { AppText } from "@/components/shared/app-text";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { PlusSide } from "@/features/intake/v2/machine";
import { cn } from "@/lib/utils";

const isSide = (value: string): value is PlusSide =>
	value === "free" || value === "plus";

/** The label's colour: ink on the ember thumb, plain on the quiet one, muted when off. */
const LABEL_TONE: Record<PlusSide, string> = {
	free: "text-foreground",
	plus: "text-offer-ink",
};

type Props = { onChange: (side: PlusSide) => void; side: PlusSide };

export function PlusSwitch({ onChange, side }: Props) {
	return (
		<SegmentedControl
			accessibilityLabel="Compare"
			accessibilityRole="radiogroup"
			className="mx-5 mt-4 rounded-full border border-border bg-surface p-1"
			onValueChange={(value) => {
				if (isSide(value)) {
					onChange(value);
				}
			}}
			value={side}
		>
			<SegmentedControl.Indicator
				className={cn(
					"top-1 rounded-full",
					side === "plus" ? "bg-ember" : "bg-surface-tertiary"
				)}
			/>
			<SideItem label="Free" on={side === "free"} value="free" />
			<SideItem label="With Plus" on={side === "plus"} value="plus" />
		</SegmentedControl>
	);
}

type ItemProps = { label: string; on: boolean; value: PlusSide };

function SideItem({ label, on, value }: ItemProps) {
	return (
		<SegmentedControl.Item
			accessibilityLabel={label}
			accessibilityRole="radio"
			accessibilityState={{ checked: on }}
			className="min-h-11 flex-1 items-center justify-center"
			value={value}
		>
			<AppText
				className={cn(
					"font-[Poppins-SemiBold] text-[15px]",
					on ? LABEL_TONE[value] : "text-muted"
				)}
			>
				{label}
			</AppText>
		</SegmentedControl.Item>
	);
}
