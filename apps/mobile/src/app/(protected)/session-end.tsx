import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { XolacerAvatar } from "@/features/connect/parts/xolacer-avatar";
import { LetterTile } from "@/features/letters/end-card/letter-tile";
import { useEndLetters } from "@/features/letters/end-card/use-end-letters";
import {
	type NextParts,
	SessionEndData,
} from "@/features/session-end/session-end-data";
import { pathOf } from "@/features/session-end/session-end-model";
import { SessionEndScreen } from "@/features/session-end/session-end-screen";
import { COPY as YOU_COPY } from "@/features/you/copy";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";

type Params = { path?: string; sessionId?: string };

const PARTS: NextParts = {
	listenerAvatar: (listener, size) => (
		<XolacerAvatar
			id={listener.id}
			name={listener.name}
			online={listener.present}
			photoUrl={listener.photoUrl}
			size={size}
		/>
	),
	partIcon: (domain) => DOMAIN_ICON[domain],
	partName: (domain) => YOU_COPY.steadiness.domains[domain],
};

export default function SessionEnd() {
	const { path, sessionId } = useLocalSearchParams<Params>();
	const letters = useEndLetters();
	return (
		<SessionEndData
			letters={{ ...letters, tile: <LetterTile /> }}
			parts={PARTS}
			path={pathOf(path)}
			sessionId={(sessionId as Id<"sessions"> | undefined) ?? null}
		>
			<SessionEndScreen />
		</SessionEndData>
	);
}
