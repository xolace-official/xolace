"use client";

import { api } from "@xolace/backend/api";
import { Spinner } from "@xolace/ui/components/spinner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { runAction } from "@/features/content/run-action";
import {
	PageHeader,
	PageHeaderDescription,
	PageHeaderHeading,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { ChannelsTable } from "./channels-table";
import { CHANNEL_COPY, type Channel, PLAN_LABEL } from "./types";

/** `/outreach-channels`: each channel's kill switch and plan, read on every enqueue. */
export function OutreachChannelsScreen() {
	// Skipped until Convex has the Clerk token (see LibraryProvider).
	const { isAuthenticated } = useConvexAuth();
	const configs = useQuery(
		api.admin.outreachChannels.listChannelConfigs,
		isAuthenticated ? {} : "skip"
	);
	const setConfig = useMutation(api.admin.outreachChannels.setChannelConfig);
	const [busy, setBusy] = useState<Channel>();

	return (
		<>
			<PageHeader>
				<PageHeaderHeading>
					<PageHeaderTitle>Outreach channels</PageHeaderTitle>
				</PageHeaderHeading>
				<PageHeaderDescription>
					Where Xolace may reach people outside the app. A change applies to the
					next outreach queued; turning a channel off never unlinks anyone.
				</PageHeaderDescription>
			</PageHeader>

			{configs === undefined ? (
				<div
					aria-live="polite"
					className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"
				>
					<Spinner />
					Reading the channels…
				</div>
			) : (
				<ChannelsTable
					busy={busy}
					configs={configs}
					onSet={async (channel, setting) => {
						const { title } = CHANNEL_COPY[channel];
						setBusy(channel);
						await runAction(
							() => setConfig({ channel, ...setting }),
							`${title} is ${setting.enabled ? "on" : "off"}, open to ${PLAN_LABEL[setting.plan].toLowerCase()}`
						);
						setBusy(undefined);
					}}
				/>
			)}
		</>
	);
}
