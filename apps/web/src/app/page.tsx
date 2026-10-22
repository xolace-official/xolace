"use client";
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";

const STATUS = {
	checking: { dot: "bg-orange-400", label: "Checking..." },
	connected: { dot: "bg-green-500", label: "Connected" },
	error: { dot: "bg-red-500", label: "Error" },
} as const;

function getStatus(healthCheck: string | undefined): keyof typeof STATUS {
	if (healthCheck === undefined) {
		return "checking";
	}
	return healthCheck === "OK" ? "connected" : "error";
}

export default function Home() {
	const healthCheck = useQuery(api.healthCheck.get);
	const status = STATUS[getStatus(healthCheck)];

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<h1 className="py-6 font-semibold text-3xl">Xolace</h1>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div className={`h-2 w-2 rounded-full ${status.dot}`} />
						<span className="text-muted-foreground text-sm">
							{status.label}
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
