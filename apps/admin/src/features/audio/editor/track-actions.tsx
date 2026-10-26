"use client";

import { Button } from "@xolace/ui/components/button";

import {
	DiscardButton as ContentDiscardButton,
	SaveButton as ContentSaveButton,
	PublishOrRetire,
} from "@/features/content/editor-actions";
import { GateItem, GateList, GateSummary } from "@/features/content/gate-list";

import { useTrackEditor } from "./track-editor-provider";

export function SaveButton() {
	const {
		actions,
		meta: { dirty },
	} = useTrackEditor();
	return <ContentSaveButton dirty={dirty} onSave={actions.save} />;
}

export function DiscardButton() {
	const {
		actions,
		meta: { dirty },
	} = useTrackEditor();
	return <ContentDiscardButton dirty={dirty} onDiscard={actions.discard} />;
}

/** Gates with their fixes; only the safety review can be cleared from here. */
export function TrackChecklist() {
	const {
		actions,
		state: { gates },
	} = useTrackEditor();
	return (
		<GateList>
			{gates.map((gate) => (
				<GateItem gate={gate} key={gate.id}>
					{gate.id === "safety" ? (
						<Button
							className="w-fit"
							onClick={actions.markSafetyReviewed}
							size="xs"
							variant="warning"
						>
							Mark safety reviewed
						</Button>
					) : null}
				</GateItem>
			))}
		</GateList>
	);
}

export function TrackChecklistSummary() {
	const {
		state: { blocking },
	} = useTrackEditor();
	return <GateSummary blocking={blocking} />;
}

/** Publish (with a confirm), or Retire once the track is live. */
export function PublishButton() {
	const {
		actions,
		state: { saved },
		meta: { canPublish, dirty },
	} = useTrackEditor();

	return (
		<PublishOrRetire
			canPublish={canPublish}
			dirty={dirty}
			name={saved.title}
			onPublish={actions.publish}
			onRetire={actions.retire}
			publishEffect="It appears in Browse and recommendations for every listener on the next app refresh."
			retireEffect="It leaves Browse and recommendations, for example when a licence lapses. Listening history stays. You can publish it again later."
			status={saved.status}
		/>
	);
}
