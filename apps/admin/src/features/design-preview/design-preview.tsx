"use client";

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import { Badge } from "@xolace/ui/components/badge";
import { Button } from "@xolace/ui/components/button";
import { Card, CardDescription, CardTitle } from "@xolace/ui/components/card";
import { Checkbox } from "@xolace/ui/components/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@xolace/ui/components/dialog";
import { Input } from "@xolace/ui/components/input";
import { Label } from "@xolace/ui/components/label";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@xolace/ui/components/progress";
import { Switch } from "@xolace/ui/components/switch";
import {
	Tabs,
	TabsCount,
	TabsList,
	TabsTrigger,
} from "@xolace/ui/components/tabs";
import { Textarea } from "@xolace/ui/components/textarea";
import {
	BanIcon,
	CheckIcon,
	CircleCheckIcon,
	ClockIcon,
	DownloadIcon,
	EyeIcon,
	FlagIcon,
	FunnelIcon,
	HeadphonesIcon,
	InfoIcon,
	OctagonAlertIcon,
	PencilIcon,
	ShieldCheckIcon,
	SparklesIcon,
	TriangleAlertIcon,
	UsersIcon,
} from "lucide-react";
import { useState } from "react";

import { StatCard } from "@/features/dashboard/stat-card";
import { EmptyState } from "@/features/flux/empty-state";

import { SampleQueue } from "./sample-queue";
import { Section } from "./section";

const REASONS = [
	{ description: "Links, ads or repeated posts.", id: "spam", title: "Spam" },
	{
		description: "Targets another person.",
		id: "harassment",
		title: "Harassment",
	},
	{
		description: "Mentions self-harm or a crisis.",
		id: "safety",
		title: "Safety risk",
	},
];

export function DesignPreview() {
	const [tab, setTab] = useState<string | number | null>("pending");
	const [reason, setReason] = useState("harassment");
	const [row, setRow] = useState("r1");

	return (
		<>
			<Section title="Buttons">
				<div className="flex flex-wrap items-center gap-4">
					<Button>
						<CheckIcon />
						Approve
					</Button>
					<Button variant="secondary">
						<EyeIcon />
						Preview
					</Button>
					<Button variant="success">Resolve</Button>
					<Button variant="warning">
						<ClockIcon />
						Snooze
					</Button>
					<Button variant="destructive">
						<BanIcon />
						Ban user
					</Button>
				</div>
				<div className="mt-5 flex flex-wrap items-center gap-4">
					<Button variant="outline">Cancel</Button>
					<Button variant="ghost">
						<PencilIcon />
						Edit
					</Button>
					<Button aria-label="Filter" size="icon" variant="outline">
						<FunnelIcon />
					</Button>
					<Button disabled>Disabled</Button>
					<Button size="sm" variant="outline">
						<DownloadIcon />
						Export
					</Button>
					<Button size="sm">Review</Button>
					<Button size="lg">Open queue</Button>
				</div>
			</Section>

			<Section title="Badges">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant="mint">
						<CircleCheckIcon />
						Approved
					</Badge>
					<Badge variant="ember">
						<ClockIcon />
						Needs review
					</Badge>
					<Badge variant="coral">
						<BanIcon />
						Removed
					</Badge>
					<Badge variant="sky">
						<InfoIcon />
						New
					</Badge>
					<Badge variant="lavender">
						<ShieldCheckIcon />
						Admin
					</Badge>
					<Badge variant="pink">
						<SparklesIcon />
						Xolace+
					</Badge>
					<Badge>Draft</Badge>
					<Badge solid variant="coral">
						12
					</Badge>
					<Badge solid variant="lavender">
						3
					</Badge>
				</div>
			</Section>

			<Section title="Stat cards">
				<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						caption="vs last week"
						delta="+8.2%"
						icon={<UsersIcon />}
						label="Active users"
						trend="up"
						value="12,480"
					/>
					<StatCard
						delta="+3.1%"
						icon={<HeadphonesIcon />}
						label="Talk sessions"
						tone="sky"
						trend="up"
						value="3,912"
					/>
					<StatCard
						caption="today"
						delta="+12"
						icon={<FlagIcon />}
						invertTrend
						label="Open reports"
						tone="coral"
						trend="up"
						value="47"
					/>
					<StatCard
						delta="-38s"
						icon={<ClockIcon />}
						invertTrend
						label="Avg. review time"
						tone="ember"
						trend="down"
						value="4m 12s"
					/>
				</div>
			</Section>

			<Section title="Tabs and table">
				<Tabs onValueChange={setTab} value={tab}>
					<TabsList>
						<TabsTrigger value="pending">
							Pending <TabsCount>47</TabsCount>
						</TabsTrigger>
						<TabsTrigger value="escalated">
							Escalated <TabsCount>3</TabsCount>
						</TabsTrigger>
						<TabsTrigger value="resolved">Resolved</TabsTrigger>
						<TabsTrigger value="all">All</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className="mt-4">
					<SampleQueue onSelect={setRow} selected={row} />
				</div>
			</Section>

			<Section title="Cards">
				<div className="grid gap-6 md:grid-cols-3">
					{REASONS.map((item) => (
						<button
							className={`lip pressable depth-md cursor-pointer rounded-lg border-2 p-6 text-left ${
								item.id === reason
									? "lip-lavender-lip border-lavender bg-lavender-soft"
									: "border-line bg-surface hover:bg-surface-sunken"
							}`}
							key={item.id}
							onClick={() => setReason(item.id)}
							type="button"
						>
							<div className="type-h3 text-ink">{item.title}</div>
							<p className="type-body mt-2 text-ink-muted">
								{item.description}
							</p>
						</button>
					))}
				</div>
				<Card className="mt-6">
					<div className="px-6">
						<CardTitle>Report #4821</CardTitle>
						<CardDescription className="mt-2">
							Vent flagged for self-harm language. 2 reports.
						</CardDescription>
					</div>
				</Card>
			</Section>

			<Section title="Forms">
				<div className="grid max-w-3xl gap-6 md:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="display-name">Display name</Label>
						<Input defaultValue="quiet_river" id="display-name" />
						<p className="type-small text-ink-muted">Shown on public posts.</p>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="removal-reason">Removal reason</Label>
						<Input aria-invalid defaultValue="spam" id="removal-reason" />
						<p className="type-small flex items-center gap-1.5 font-semibold text-coral-text">
							<OctagonAlertIcon className="size-3.5 stroke-3" />
							Enter a reason of at least 10 characters.
						</p>
					</div>
					<div className="grid gap-2 md:col-span-2">
						<Label htmlFor="internal-note">Internal note</Label>
						<Textarea
							id="internal-note"
							placeholder="Only staff can see this."
						/>
					</div>
					<Label>
						<Checkbox defaultChecked />
						Notify reporter
					</Label>
					<Label>
						<Switch defaultChecked />
						Voice talks enabled
					</Label>
				</div>
			</Section>

			<Section title="Progress">
				<div className="grid max-w-xl gap-5">
					<Progress value={72}>
						<ProgressLabel>Queue cleared today</ProgressLabel>
						<ProgressValue />
					</Progress>
					<Progress tone="lavender" value={62}>
						<ProgressLabel>Content ingestion</ProgressLabel>
						<ProgressValue />
					</Progress>
					<Progress tone="ember" value={91}>
						<ProgressLabel>Storage used</ProgressLabel>
						<ProgressValue />
					</Progress>
				</div>
			</Section>

			<Section title="Alerts">
				<div className="grid max-w-2xl gap-4">
					<Alert variant="sky">
						<InfoIcon />
						<AlertTitle>Staging backend</AlertTitle>
						<AlertDescription>
							Changes here do not reach real users.
						</AlertDescription>
					</Alert>
					<Alert variant="mint">
						<CircleCheckIcon />
						<AlertTitle>Report resolved</AlertTitle>
						<AlertDescription>
							The reporter was notified in the app.
						</AlertDescription>
					</Alert>
					<Alert variant="ember">
						<TriangleAlertIcon />
						<AlertTitle>3 reports past SLA</AlertTitle>
						<AlertDescription>
							Escalated items wait longer than 30 minutes.
						</AlertDescription>
						<AlertAction>
							<Button size="sm" variant="outline">
								Review
							</Button>
						</AlertAction>
					</Alert>
					<Alert variant="coral">
						<OctagonAlertIcon />
						<AlertTitle>Ingestion failed</AlertTitle>
						<AlertDescription>
							2 of 14 files had no content hash. Re-upload them.
						</AlertDescription>
					</Alert>
				</div>
			</Section>

			<Section title="Empty state and dialog">
				<div className="grid gap-6 md:grid-cols-2">
					<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
						<EmptyState
							action={<Button variant="outline">View resolved</Button>}
							description="No reports waiting. Flux is proud of you."
							pose="celebrate"
							title="Queue is clear"
						/>
					</div>
					<div className="lip depth-md flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-line bg-surface p-6">
						<p className="type-body text-ink-muted">
							Confirmations use a dialog.
						</p>
						<Dialog>
							<DialogTrigger render={<Button variant="destructive" />}>
								<BanIcon />
								Ban user
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Ban this user?</DialogTitle>
									<DialogDescription>
										Amara won&apos;t be able to post, vent or join talks. You
										can lift the ban from their profile.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<DialogClose render={<Button variant="outline" />}>
										Cancel
									</DialogClose>
									<DialogClose render={<Button variant="destructive" />}>
										<BanIcon />
										Ban user
									</DialogClose>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</Section>
		</>
	);
}
