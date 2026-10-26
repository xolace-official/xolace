"use client";

import { Button } from "@xolace/ui/components/button";
import { cn } from "@xolace/ui/lib/utils";
import {
	CircleAlertIcon,
	CircleCheckIcon,
	TriangleAlertIcon,
} from "lucide-react";

import type { PublishGate } from "../publish-gates";
import { useEntryEditor } from "./entry-editor-provider";

/** The publish gates for this entry, each with its fix where the UI can do it. */
export function PublishChecklist({ className }: { className?: string }) {
	const {
		state: { gates },
	} = useEntryEditor();

	return (
		<ul
			aria-label="Publish checklist"
			className={cn("flex flex-col gap-3", className)}
		>
			{gates.map((gate) => (
				<li className="flex gap-3" key={gate.id}>
					<GateIcon gate={gate} />
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<span className="type-body-strong text-ink">
							{gate.label}
							<span className="sr-only">
								{gate.state === "pass" ? ": done" : ": not done"}
							</span>
						</span>
						{gate.state === "fail" ? (
							<>
								<span className="type-small text-ink-muted">{gate.help}</span>
								<GateFix gate={gate} />
							</>
						) : null}
					</div>
				</li>
			))}
		</ul>
	);
}

function GateIcon({ gate }: { gate: PublishGate }) {
	if (gate.state === "pass") {
		return (
			<CircleCheckIcon
				aria-hidden
				className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-mint-text"
			/>
		);
	}
	return gate.required ? (
		<CircleAlertIcon
			aria-hidden
			className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-coral-text"
		/>
	) : (
		<TriangleAlertIcon
			aria-hidden
			className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-ember-text"
		/>
	);
}

function GateFix({ gate }: { gate: PublishGate }) {
	const {
		actions,
		meta: { dirty },
	} = useEntryEditor();

	if (gate.id === "safety") {
		return (
			<Button
				className="w-fit"
				disabled={dirty}
				onClick={actions.markSafetyReviewed}
				size="xs"
				title={
					dirty
						? "Save the body first; the review covers the saved body."
						: undefined
				}
				variant="warning"
			>
				Mark safety reviewed
			</Button>
		);
	}
	if (gate.id === "consent") {
		return (
			<Button
				className="w-fit"
				onClick={actions.recordConsent}
				size="xs"
				variant="warning"
			>
				Record consent
			</Button>
		);
	}
	return null;
}

/** "2 to fix" / "All checks pass" summary at the top of the Publish card. */
export function ChecklistSummary({ className }: { className?: string }) {
	const {
		state: { blocking },
	} = useEntryEditor();
	const ready = blocking.length === 0;

	return (
		<span
			className={cn(
				"type-small inline-flex items-center gap-1.5 font-semibold",
				ready ? "text-mint-text" : "text-coral-text",
				className
			)}
		>
			{ready ? (
				<CircleCheckIcon aria-hidden className="size-4 stroke-[2.5]" />
			) : (
				<CircleAlertIcon aria-hidden className="size-4 stroke-[2.5]" />
			)}
			{ready
				? "All checks pass"
				: `${blocking.length} to fix before publishing`}
		</span>
	);
}
