import {
	SPACE_NAME_MAX_LENGTH,
	validateSpaceName,
} from "@xolace/backend/convex/lib/spaceName";
import { useState } from "react";
import { NameDialog } from "@/components/settings-kit/name-dialog";
import { COPY } from "../copy";
import { useReflect } from "../reflect-data";

/**
 * Production's space-name prompt, asked once on Where next (kit `NameDialog`). The validator's
 * own words say what's wrong once you type; empty, Save just waits. A save the server turns down
 * shows its reason.
 */
export function SpaceName() {
	const { state, actions } = useReflect();
	const [draft, setDraft] = useState("");
	const [serverError, setServerError] = useState("");
	const empty = draft.trim() === "";
	const checked = validateSpaceName(draft);
	// As production's prompt did: an empty field says nothing, Save just waits.
	const error = checked.ok || empty ? serverError : checked.message;

	const onDraft = (value: string) => {
		setDraft(value);
		setServerError("");
	};
	const onSave = async (name: string) => {
		const failed = await actions.saveSpaceName(name);
		setServerError(failed ?? "");
	};

	return (
		<NameDialog
			canSave={!empty}
			copy={COPY.next.spaceName}
			draft={draft}
			error={error}
			max={SPACE_NAME_MAX_LENGTH}
			onCancel={actions.dismissSpaceName}
			onDraft={onDraft}
			onSave={(name) => void onSave(name)}
			open={state.spaceNameOpen}
		/>
	);
}
