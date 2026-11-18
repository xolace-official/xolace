import type { ReactNode } from "react";
import { View } from "react-native";
import { Hairline, SettingsCard } from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import type { IconName } from "@/components/shared/icon";
import {
	CHANNEL_NAME,
	type Channel,
	type OrderMark,
} from "@/features/reach-me-on/reach-view";
import { playSoftPress } from "@/lib/haptics";

const CHANNEL_ICON: Record<Channel, IconName> = {
	push: { android: "notifications", ios: "bell.fill" },
	telegram: { android: "send", ios: "paperplane.fill" },
};

/** One action row in a channel card; offline, a row that needs the network does nothing. */
export type CardAction = {
	label: string;
	icon: IconName;
	onPress: () => void;
	danger?: boolean;
	/** Works offline (the paywall). */
	offlineOk?: boolean;
};

const TRY_FIRST_ICON: IconName = {
	android: "vertical_align_top",
	ios: "arrow.up.to.line",
};

type Props = {
	channel: Channel;
	statusLine?: string;
	/** From `orderMark`: First as the head row's value, or a Try this first row. */
	mark: OrderMark;
	onTryFirst: () => void;
	/** The head row's value when it isn't First (Xolace+). */
	tag?: string;
	children?: ReactNode;
	actions?: readonly CardAction[];
	disabled?: boolean;
};

/**
 * One channel on "Reach me on…" as a grouped card: a head row (tile, name, status, First),
 * its body, then its actions as rows.
 */
export const ChannelCard = ({
	channel,
	statusLine,
	mark,
	onTryFirst,
	tag,
	children,
	actions = [],
	disabled = false,
}: Props) => {
	const rows: CardAction[] = [
		...actions,
		...(mark === "try_first"
			? [{ icon: TRY_FIRST_ICON, label: "Try this first", onPress: onTryFirst }]
			: []),
	];
	const hasRows = rows.length > 0;
	return (
		<SettingsCard>
			<TileRow
				icon={CHANNEL_ICON[channel]}
				label={CHANNEL_NAME[channel]}
				// The head row draws the line itself only when no body sits under it.
				last={Boolean(children) || !hasRows}
				sub={statusLine}
				value={mark === "first" ? "First" : tag}
			/>
			{children ? (
				<View className="gap-3 px-4 pt-1 pb-4">
					{children}
					{hasRows ? <Hairline /> : null}
				</View>
			) : null}
			{rows.map((row, i) => {
				const off = disabled && !row.offlineOk;
				return (
					<TileRow
						a11y={off ? `${row.label}, unavailable offline` : undefined}
						danger={row.danger}
						icon={row.icon}
						key={row.label}
						label={row.label}
						last={i === rows.length - 1}
						onPress={
							off
								? undefined
								: () => {
										playSoftPress();
										row.onPress();
									}
						}
						trail="none"
					/>
				);
			})}
		</SettingsCard>
	);
};
