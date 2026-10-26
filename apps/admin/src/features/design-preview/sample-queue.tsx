import { Avatar, AvatarFallback } from "@xolace/ui/components/avatar";
import { Badge } from "@xolace/ui/components/badge";
import { Button } from "@xolace/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xolace/ui/components/table";
import {
	BanIcon,
	CircleCheckIcon,
	ClockIcon,
	EllipsisIcon,
	TriangleAlertIcon,
} from "lucide-react";

const STATUS = {
	approved: { icon: <CircleCheckIcon />, label: "Approved", tone: "mint" },
	escalated: { icon: <TriangleAlertIcon />, label: "Escalated", tone: "pink" },
	removed: { icon: <BanIcon />, label: "Removed", tone: "coral" },
	review: { icon: <ClockIcon />, label: "Needs review", tone: "ember" },
} as const;

const ROWS = [
	{
		at: "09:41",
		id: "r1",
		reason: "Self-harm language",
		reports: 3,
		status: "review",
		type: "Vent",
		user: "Amara Okafor",
	},
	{
		at: "09:12",
		id: "r2",
		reason: "Spam link",
		reports: 7,
		status: "removed",
		type: "Comment",
		user: "Leo Brandt",
	},
	{
		at: "08:57",
		id: "r3",
		reason: "Harassment",
		reports: 2,
		status: "escalated",
		type: "Talk",
		user: "Mei Tanaka",
	},
	{
		at: "08:30",
		id: "r4",
		reason: "False report",
		reports: 1,
		status: "approved",
		type: "Vent",
		user: "Sam Rivera",
	},
] as const;

export function SampleQueue({
	selected,
	onSelect,
}: {
	selected: string;
	onSelect: (id: string) => void;
}) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>User</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Reason</TableHead>
					<TableHead>Status</TableHead>
					<TableHead className="text-right">Reports</TableHead>
					<TableHead className="text-right">Time</TableHead>
					<TableHead>
						<span className="sr-only">Actions</span>
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{ROWS.map((row) => {
					const status = STATUS[row.status];
					return (
						<TableRow
							className="cursor-pointer"
							data-state={row.id === selected ? "selected" : undefined}
							key={row.id}
							onClick={() => onSelect(row.id)}
						>
							<TableCell>
								<span className="inline-flex items-center gap-3">
									<Avatar size="sm">
										<AvatarFallback name={row.user} />
									</Avatar>
									<span className="type-body-strong">{row.user}</span>
								</span>
							</TableCell>
							<TableCell>{row.type}</TableCell>
							<TableCell>{row.reason}</TableCell>
							<TableCell>
								<Badge variant={status.tone}>
									{status.icon}
									{status.label}
								</Badge>
							</TableCell>
							<TableCell className="text-right">{row.reports}</TableCell>
							<TableCell className="text-right">{row.at}</TableCell>
							<TableCell className="text-right">
								<Button
									aria-label="More actions"
									size="icon-sm"
									variant="ghost"
								>
									<EllipsisIcon />
								</Button>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
