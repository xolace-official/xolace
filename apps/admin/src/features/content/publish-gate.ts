/** One rule an item must pass before it goes live (docs/plan/admin-v1.md, "Rules the UI must surface"). */
export interface PublishGate {
	/** Shown under the label when the gate fails. */
	help: string;
	id: string;
	label: string;
	/** `false` = a soft warning; Publish still works. */
	required: boolean;
	state: "pass" | "fail";
}

export function blockingGates(gates: readonly PublishGate[]) {
	return gates.filter((gate) => gate.required && gate.state === "fail");
}
