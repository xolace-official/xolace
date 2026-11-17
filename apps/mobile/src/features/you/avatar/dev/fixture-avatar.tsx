/** The avatar sheet on fixtures: the board's ten stand-ins; a pick only closes it. */
import { AvatarProvider } from "@/features/you/avatar/avatar-data";
import { AvatarSheet } from "@/features/you/avatar/avatar-sheet";
import { FIXTURE_AVATARS } from "@/features/you/avatar/dev/avatars";
import { isLocked, resolveAvatar } from "@/features/you/avatar-model";

export function FixtureAvatar({ plus }: { plus: boolean }) {
	return (
		<AvatarProvider
			value={{
				actions: { pick: (a) => !isLocked(a, plus) },
				state: {
					avatars: FIXTURE_AVATARS,
					current: resolveAvatar(FIXTURE_AVATARS, "moon"),
					isPlus: plus,
				},
			}}
		>
			<AvatarSheet />
		</AvatarProvider>
	);
}
