import { AvatarData } from "@/features/you/avatar/avatar-data";
import { AvatarSheet } from "@/features/you/avatar/avatar-sheet";

/** The avatar picker, over You. */
export default function AvatarRoute() {
	return (
		<AvatarData>
			<AvatarSheet />
		</AvatarData>
	);
}
