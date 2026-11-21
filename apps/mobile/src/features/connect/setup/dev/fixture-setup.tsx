import { useState } from "react";
import { Image } from "react-native";
import { EditScreen } from "../edit-screen";
import { SetupProvider, type SetupScreenData } from "../setup-data";
import { LAST_STEP, type SetupDraft, toggleSpecialty } from "../setup-model";
import { SetupScreen } from "../setup-screen";

const noop = () => undefined;

const PHOTO = Image.resolveAssetSource(
	require("@/assets/images/onboarding/restless-mini.jpeg")
)?.uri;

type Phase = "loading" | "missing";

export function FixtureSetup({
	draft,
	step = 0,
	uploading = false,
	phase,
	edit,
}: {
	draft: SetupDraft;
	step?: number;
	uploading?: boolean;
	phase?: Phase;
	edit?: boolean;
}) {
	const [d, setD] = useState<SetupDraft>({
		...draft,
		photoUrl: draft.photoUrl ? PHOTO : undefined,
	});
	const [at, setAt] = useState(step);
	const [active, setActive] = useState(true);
	const value: SetupScreenData = {
		actions: {
			back: () => setAt((i) => Math.max(0, i - 1)),
			close: noop,
			next: () => setAt((i) => Math.min(LAST_STEP, i + 1)),
			pickPhoto: () => setD((x) => ({ ...x, photoUrl: PHOTO })),
			save: noop,
			setActive,
			setBio: (bio) => setD((x) => ({ ...x, bio })),
			setName: (displayName) => setD((x) => ({ ...x, displayName })),
			toggleSpecialty: (slug) =>
				setD((x) => ({
					...x,
					specialties: toggleSpecialty(x.specialties, slug),
				})),
		},
		state: phase
			? { phase }
			: {
					active,
					busy: false,
					draft: d,
					phase: "ready",
					step: at,
					uploading,
				},
	};
	return (
		<SetupProvider value={value}>
			{edit ? <EditScreen /> : <SetupScreen />}
		</SetupProvider>
	);
}
