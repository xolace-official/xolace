import type { PlusStatus } from "@/features/purchases/plus-status";
import { AvatarProvider } from "@/features/you/avatar/avatar-data";
import { AvatarSheet } from "@/features/you/avatar/avatar-sheet";
import { FIXTURE_AVATARS } from "@/features/you/avatar/dev/avatars";
import { avatarTap, resolveAvatar } from "@/features/you/avatar-model";

export function FixtureAvatar({ plus }: { plus: PlusStatus }) {
	return (
		<AvatarProvider
			value={{
				actions: { pick: (a) => avatarTap(a, plus) === "pick" },
				state: {
					avatars: FIXTURE_AVATARS,
					current: resolveAvatar(FIXTURE_AVATARS, "moon"),
					plus,
				},
			}}
		>
			<AvatarSheet />
		</AvatarProvider>
	);
}
