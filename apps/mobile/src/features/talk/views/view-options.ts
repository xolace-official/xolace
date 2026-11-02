// A talk's two views, as the native segmented control lists them.

import type { TalkView } from "@xolace/backend/convex/lib/voices";

export const VIEW_OPTIONS: { value: TalkView; label: string }[] = [
	{ label: "Conversation", value: "conversation" },
	{ label: "Companion", value: "companion" },
];

export type ViewSwitchProps = {
	view: TalkView;
	onChange: (view: TalkView) => void;
};
