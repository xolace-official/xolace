import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import {
	MomentProvider,
	type MomentScreenData,
} from "@/features/you/moments/moment/moment-data";
import { MomentScreen } from "@/features/you/moments/moment/moment-screen";
import { isMissingMoment } from "@/features/you/moments/moments-model";

const noop = () => undefined;
const GONE: MomentScreenData = {
	actions: { again: noop, share: noop, toggleAudio: noop },
	state: null,
};

/** The gone state for a moment that isn't there; anything else goes on to the root boundary,
 * which reports it. */
function Gone({ error }: FallbackProps) {
	if (!isMissingMoment(error)) {
		throw error;
	}
	return (
		<MomentProvider value={GONE}>
			<MomentScreen />
		</MomentProvider>
	);
}

/**
 * A moment's reads throw, never return null, when the session is gone (deleted by retention or
 * a wipe, even while open) or isn't yours, or the link's id isn't a session's: a stale card or
 * an old `/timeline/session/<id>` link. Caught here, that's "This moment isn't here any more"
 * instead of the whole app's error screen.
 */
export function MomentGuard({
	id,
	children,
}: {
	id: string | undefined;
	children: ReactNode;
}) {
	return (
		<ErrorBoundary FallbackComponent={Gone} resetKeys={[id]}>
			{children}
		</ErrorBoundary>
	);
}
