import { EmptyState } from "@/features/flux/empty-state";
import { AdminShell } from "@/features/shell/admin-shell";

export default function AdminHome() {
	return (
		<AdminShell current="dashboard">
			<h1 className="type-h1 text-ink">Dashboard</h1>
			<div className="lip depth-md mt-8 rounded-xl border-2 border-line bg-surface">
				<EmptyState
					description="Moderation queues, users and content tools will land here."
					pose="wave"
					title="Welcome to admin"
				/>
			</div>
		</AdminShell>
	);
}
