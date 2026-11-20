import type { DevState } from "@/dev/dev-state";
import { FixtureSetup } from "./fixture-setup";
import { CAP_DRAFT, EMPTY_DRAFT, FULL_DRAFT } from "./setup-fixtures";

const SETUP = { headerShown: false };
const EDIT = { headerShown: true, title: "" };
const STEP = { bio: 2, name: 1, review: 4, specialties: 3 } as const;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "setup-photo",
		options: SETUP,
		Screen: () => <FixtureSetup draft={EMPTY_DRAFT} />,
		title: "Setup: photo, none yet",
	},
	{
		id: "setup-photo-uploading",
		options: SETUP,
		Screen: () => <FixtureSetup draft={EMPTY_DRAFT} uploading />,
		title: "Setup: photo uploading",
	},
	{
		id: "setup-photo-chosen",
		options: SETUP,
		Screen: () => (
			<FixtureSetup draft={{ ...EMPTY_DRAFT, photoUrl: FULL_DRAFT.photoUrl }} />
		),
		title: "Setup: photo chosen",
	},
	{
		id: "setup-name",
		options: SETUP,
		Screen: () => (
			<FixtureSetup
				draft={{ ...EMPTY_DRAFT, displayName: "Ama", photoUrl: "set" }}
				step={STEP.name}
			/>
		),
		title: "Setup: name",
	},
	{
		id: "setup-bio",
		options: SETUP,
		Screen: () => (
			<FixtureSetup
				draft={{ ...FULL_DRAFT, specialties: [] }}
				step={STEP.bio}
			/>
		),
		title: "Setup: bio",
	},
	{
		id: "setup-specialties",
		options: SETUP,
		Screen: () => <FixtureSetup draft={FULL_DRAFT} step={STEP.specialties} />,
		title: "Setup: specialties",
	},
	{
		id: "setup-cap",
		options: SETUP,
		Screen: () => <FixtureSetup draft={CAP_DRAFT} step={STEP.specialties} />,
		title: "Setup: specialties at the cap",
	},
	{
		id: "setup-review-gaps",
		options: SETUP,
		Screen: () => <FixtureSetup draft={EMPTY_DRAFT} step={STEP.review} />,
		title: "Setup: review with gaps",
	},
	{
		id: "setup-review",
		options: SETUP,
		Screen: () => <FixtureSetup draft={FULL_DRAFT} step={STEP.review} />,
		title: "Setup: review, ready to publish",
	},
	{
		id: "setup-loading",
		options: SETUP,
		Screen: () => <FixtureSetup draft={EMPTY_DRAFT} phase="loading" />,
		title: "Setup loading",
	},
	{
		id: "edit",
		options: EDIT,
		Screen: () => <FixtureSetup draft={FULL_DRAFT} edit />,
		title: "Edit profile",
	},
	{
		id: "edit-gap",
		options: EDIT,
		Screen: () => <FixtureSetup draft={{ ...FULL_DRAFT, bio: "" }} edit />,
		title: "Edit profile, a field emptied",
	},
	{
		id: "edit-loading",
		options: EDIT,
		Screen: () => <FixtureSetup draft={FULL_DRAFT} edit phase="loading" />,
		title: "Edit profile loading",
	},
	{
		id: "edit-missing",
		options: EDIT,
		Screen: () => <FixtureSetup draft={FULL_DRAFT} edit phase="missing" />,
		title: "Edit profile: no profile",
	},
];
