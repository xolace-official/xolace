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
