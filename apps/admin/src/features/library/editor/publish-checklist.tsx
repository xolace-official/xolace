"use client";

import { Button } from "@xolace/ui/components/button";

import { GateItem, GateList, GateSummary } from "@/features/content/gate-list";
import type { PublishGate } from "@/features/content/publish-gate";

import { useEntryEditor } from "./entry-editor-provider";

/** The publish gates for this entry, each with its fix where the UI can do it. */
export function PublishChecklist({ className }: { className?: string }) {
	const {
		state: { gates },
	} = useEntryEditor();

	return (
		<GateList className={className}>
			{gates.map((gate) => (
				<GateItem gate={gate} key={gate.id}>
					<GateFix gate={gate} />
				</GateItem>
			))}
		</GateList>
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

export function ChecklistSummary({ className }: { className?: string }) {
	const {
		state: { blocking },
	} = useEntryEditor();
	return <GateSummary blocking={blocking} className={className} />;
}
