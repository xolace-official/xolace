"use client";

import {
	DiscardButton as ContentDiscardButton,
	SaveButton as ContentSaveButton,
	PublishOrRetire,
} from "@/features/content/editor-actions";

import { useEntryEditor } from "./entry-editor-provider";

export function SaveButton() {
	const {
		actions,
		meta: { dirty },
	} = useEntryEditor();
	return <ContentSaveButton dirty={dirty} onSave={actions.save} />;
}

export function DiscardButton() {
	const {
		actions,
		meta: { dirty },
	} = useEntryEditor();
	return <ContentDiscardButton dirty={dirty} onDiscard={actions.discard} />;
}

/** Publish (with a confirm), or Retire once the entry is live. */
export function PublishButton() {
	const {
		actions,
		state: { saved },
		meta: { canPublish, dirty },
	} = useEntryEditor();

	return (
		<PublishOrRetire
			canPublish={canPublish}
			dirty={dirty}
			name={saved.title}
			onPublish={actions.publish}
			onRetire={actions.retire}
			publishEffect="It appears in the Library and search for every reader on the next app refresh."
			retireEffect="It leaves the Library and search. Readers who saved it keep their history. You can publish it again later."
			status={saved.status}
		/>
	);
}
