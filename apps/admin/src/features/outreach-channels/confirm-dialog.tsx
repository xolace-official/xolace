"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@xolace/ui/components/alert-dialog";

import {
	CHANNEL_COPY,
	type Channel,
	type ChannelPlan,
	PLAN_SCOPE,
} from "./types";

/** Open while `enabling` is set: true asks to turn the channel on, false off. */
export function ConfirmDialog({
	channel,
	plan,
	enabling,
	onCancel,
	onConfirm,
}: {
	channel: Channel;
	plan: ChannelPlan;
	enabling: boolean | null;
	onCancel: () => void;
	onConfirm: (enabled: boolean) => void;
}) {
	const copy = CHANNEL_COPY[channel];
	const on = enabling === true;
	return (
		<AlertDialog
			onOpenChange={(open) => {
				if (!open) {
					onCancel();
				}
			}}
			open={enabling !== null}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Turn {on ? "on" : "off"} {copy.title}?
					</AlertDialogTitle>
					<AlertDialogDescription>
						{on
							? `${copy.turnOn} ${PLAN_SCOPE[plan]}`
							: `New outreach stops going to ${copy.title} at once and moves to each person's next channel. Deliveries already queued still go, and nobody is unlinked.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => onConfirm(on)}
						variant={on ? "default" : "destructive"}
					>
						Turn {on ? "on" : "off"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
