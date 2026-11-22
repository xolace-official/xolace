import type { DevState } from "@/dev/dev-state";
import { COPY } from "@/features/care/bridge/copy";
import { FixtureBridge } from "@/features/care/bridge/dev/fixture-bridge";
import {
	FREE_OUT,
	LONG_NAME,
	MUM,
	MUM_DRAFT,
	PLUS_OUT,
	PLUS_SPARE,
} from "@/features/care/bridge/dev/fixtures";

const OWN_TOP = { headerShown: false };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "bridge-intro",
		options: OWN_TOP,
		Screen: () => <FixtureBridge step="intro" />,
		title: "Trusted Bridge: the first-time intro",
	},
	{
		id: "bridge-recipient",
		options: OWN_TOP,
		Screen: () => <FixtureBridge step="recipient" />,
		title: "Who it's for, empty (free, one draft today)",
	},
	{
		id: "bridge-recipient-filled",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge quota={PLUS_SPARE} recipient={MUM} step="recipient" />
		),
		title: "Who it's for: Mum, a parent, called Mum (Plus, no hint)",
	},
	{
		id: "bridge-recipient-near-cap",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge recipient={{ name: LONG_NAME }} step="recipient" />
		),
		title: "Who it's for: a long name, the counter showing",
	},
	{
		id: "bridge-recipient-free-out",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge quota={FREE_OUT} recipient={MUM} step="recipient" />
		),
		title: "Who it's for: free, today's draft used",
	},
	{
		id: "bridge-recipient-plus-out",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge quota={PLUS_OUT} recipient={MUM} step="recipient" />
		),
		title: "Who it's for: Plus, every draft used",
	},
	{
		id: "bridge-loading",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge recipient={MUM} status="loading" step="draft" />
		),
		title: "Finding the words (loading)",
	},
	{
		id: "bridge-draft",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge
				recipient={MUM}
				status="success"
				step="draft"
				text={MUM_DRAFT}
				written={MUM_DRAFT}
			/>
		),
		title: "A message for Mum: the draft settles in",
	},
	{
		id: "bridge-draft-shared",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge
				recipient={MUM}
				shared
				status="success"
				step="draft"
				text={MUM_DRAFT}
			/>
		),
		title: "Shared: Done shows",
	},
	{
		id: "bridge-draft-error",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge
				recipient={MUM}
				status="error"
				step="draft"
				text={COPY.draft.fallback}
			/>
		),
		title: "Couldn't write it: the template, and why",
	},
	{
		id: "bridge-draft-rate-limited",
		options: OWN_TOP,
		Screen: () => (
			<FixtureBridge
				recipient={MUM}
				status="rate_limited"
				step="draft"
				text={COPY.draft.fallback}
			/>
		),
		title: "Out of drafts: the template, and why",
	},
];
