import { useState } from "react";
import { Pressable, View } from "react-native";
import { Hairline, Label } from "@/components/settings-kit/parts";
import {
	LABEL,
	ROW,
	rowLabel,
} from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import {
	NOTIFY_COPY,
	NOTIFY_ICONS,
} from "@/features/settings/notifications/copy";
import {
	AFTER_HOURS,
	BEFORE_HOURS,
	hourLabel,
	type Quiet,
} from "@/features/settings/notifications/notifications-model";
import { DayBar } from "@/features/settings/notifications/quiet/day-bar";
import { cn } from "@/lib/cn";
import { tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

export type QuietEnd = "after" | "before";

function PickRow({
	label,
	value,
	open,
	last = false,
	onPress,
}: {
	label: string;
	value: string;
	open: boolean;
	last?: boolean;
	onPress: () => void;
}) {
	const subtle = useTokenColor("subtle");
	return (
		<Pressable
			accessibilityLabel={rowLabel(label, value)}
			accessibilityRole="button"
			accessibilityState={{ expanded: open }}
			className={ROW}
			onPress={onPress}
		>
			<Label>{label}</Label>
			<AppText className={cn(LABEL, "text-foreground/50")} variant="body">
				{value}
			</AppText>
			<Icon
				color={subtle}
				name={NOTIFY_ICONS.pick}
				size={11}
				weight="semibold"
			/>
			{last ? null : <Hairline />}
		</Pressable>
	);
}

/** One row's hours, open inline as 32 pt chips (board `.hrs`). */
function Hours({
	label,
	list,
	value,
	onPick,
}: {
	label: string;
	list: readonly number[];
	value: number;
	onPick: (hour: number) => void;
}) {
	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="radiogroup"
			className="flex-row flex-wrap gap-1.5 px-4 pt-1 pb-3.5"
		>
			{list.map((hour) => {
				const on = hour === value;
				return (
					<Pressable
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						className={cn(
							"h-8 justify-center rounded-full px-3",
							on ? "bg-accent" : "bg-surface-secondary"
						)}
						key={hour}
						onPress={() => {
							tap();
							onPick(hour);
						}}
					>
						<AppText
							className={cn(
								"text-[14px] leading-[18px]",
								on ? "text-accent-foreground" : "text-foreground"
							)}
							variant="body"
							weight={on ? "semibold" : undefined}
						>
							{hourLabel(hour)}
						</AppText>
					</Pressable>
				);
			})}
			<Hairline />
		</View>
	);
}

/**
 * Quiet hours under their switch (board `.day`, `.hrs`): the day bar, then "Not after" and "Not
 * before", each opening its hours inline, one at a time; picking an hour closes them.
 */
export function QuietHours({
	quiet,
	onPick,
	initialOpen = null,
}: {
	quiet: Quiet;
	onPick: (end: QuietEnd, hour: number) => void;
	/** Which row's hours start open (a dev state). */
	initialOpen?: QuietEnd | null;
}) {
	const [open, setOpen] = useState<QuietEnd | null>(initialOpen);
	const toggle = (end: QuietEnd) => setOpen(open === end ? null : end);
	const pick = (end: QuietEnd) => (hour: number) => {
		onPick(end, hour);
		setOpen(null);
	};
	return (
		<>
			<DayBar quiet={quiet} />
			<PickRow
				label={NOTIFY_COPY.notAfter}
				onPress={() => toggle("after")}
				open={open === "after"}
				value={hourLabel(quiet.after)}
			/>
			{open === "after" ? (
				<Hours
					label={NOTIFY_COPY.notAfter}
					list={AFTER_HOURS}
					onPick={pick("after")}
					value={quiet.after}
				/>
			) : null}
			<PickRow
				label={NOTIFY_COPY.notBefore}
				last
				onPress={() => toggle("before")}
				open={open === "before"}
				value={hourLabel(quiet.before)}
			/>
			{open === "before" ? (
				<Hours
					label={NOTIFY_COPY.notBefore}
					list={BEFORE_HOURS}
					onPick={pick("before")}
					value={quiet.before}
				/>
			) : null}
		</>
	);
}
