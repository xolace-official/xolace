"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xolace/ui/components/select";
import { Switch } from "@xolace/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import { useState } from "react";

import { ConfirmDialog } from "./confirm-dialog";
import {
	CHANNEL_COPY,
	type Channel,
	type ChannelConfig,
	type ChannelPlan,
	type ChannelSetting,
	formatChangedAt,
	formatReachCount,
	type NotReachable,
	PLAN_LABEL,
} from "./types";

const PLAN_ITEMS = (["free", "plus"] as const).map((plan) => ({
	label: PLAN_LABEL[plan],
	value: plan,
}));

const isPlan = (value: unknown): value is ChannelPlan =>
	PLAN_ITEMS.some((item) => item.value === value);

/**
 * Every outreach channel with its kill switch and plan. Turning a switch asks
 * first; the plan applies at once. `onSet` writes the whole row.
 */
export function ChannelsTable({
	configs,
	busy,
	onSet,
}: {
	configs: readonly ChannelConfig[];
	/**
	 * Channels with a write in flight. Each write sends the whole row, so a row
	 * stays locked until its own write lands, whatever other rows do.
	 */
	busy: ReadonlySet<Channel>;
	onSet: (channel: Channel, setting: ChannelSetting) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Channel</TableHead>
					<TableHead>On</TableHead>
					<TableHead>Open to</TableHead>
					<TableHead>Last changed</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{configs.map((config) => (
					<ChannelRow
						busy={busy.has(config.channel)}
						config={config}
						key={config.channel}
						onSet={(setting) => onSet(config.channel, setting)}
					/>
				))}
			</TableBody>
		</Table>
	);
}

function ChannelRow({
	config,
	busy,
	onSet,
}: {
	config: ChannelConfig;
	busy: boolean;
	onSet: (setting: ChannelSetting) => void;
}) {
	const copy = CHANNEL_COPY[config.channel];
	// The switch shows the stored value until the dialog is confirmed.
	const [confirming, setConfirming] = useState<boolean | null>(null);

	return (
		<TableRow>
			<TableCell className="whitespace-normal">
				<div className="flex flex-col gap-1">
					<span className="font-semibold text-ink">{copy.title}</span>
					<span className="type-small max-w-md text-ink-muted">
						{copy.description}
					</span>
					{config.notReachable ? (
						<NotReachableLine counts={config.notReachable} />
					) : null}
				</div>
			</TableCell>
			<TableCell>
				<Switch
					aria-label={`${copy.title} outreach`}
					checked={config.enabled}
					disabled={busy}
					onCheckedChange={(next) => setConfirming(next)}
				/>
				<ConfirmDialog
					channel={config.channel}
					enabling={confirming}
					onCancel={() => setConfirming(null)}
					onConfirm={(enabled) => {
						setConfirming(null);
						onSet({ enabled, plan: config.plan });
					}}
					plan={config.plan}
				/>
			</TableCell>
			<TableCell>
				<Select
					disabled={busy}
					items={PLAN_ITEMS}
					onValueChange={(plan) => {
						if (isPlan(plan) && plan !== config.plan) {
							onSet({ enabled: config.enabled, plan });
						}
					}}
					value={config.plan}
				>
					<SelectTrigger aria-label={`${copy.title} is open to`} size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{PLAN_ITEMS.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell className="text-ink-muted tabular-nums">
				{config.updatedAt === undefined
					? "Never (coded default)"
					: formatChangedAt(config.updatedAt)}
			</TableCell>
		</TableRow>
	);
}

/** Email only: people it can't reach, so turning it on reaches fewer. */
function NotReachableLine({ counts }: { counts: NotReachable }) {
	return (
		<span className="type-small text-ink-muted tabular-nums">
			Not reachable:{" "}
			<span className="font-semibold text-ink">
				{formatReachCount(counts.unreachable)}
			</span>{" "}
			hard-bounced ·{" "}
			<span className="font-semibold text-ink">
				{formatReachCount(counts.complained)}
			</span>{" "}
			marked it spam
		</span>
	);
}
