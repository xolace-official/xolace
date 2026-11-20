import { api } from "@xolace/backend/api";
import { validateSpaceName } from "@xolace/backend/convex/lib/spaceName";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { useFullContext } from "@/lib/convex/use-full-context";
import { LANDING } from "@/lib/landing";
import { useSessionEndHref } from "@/lib/path-session/session-end-href";
import { useProfileSummary } from "@/lib/profile-summary";
import { useAppStore } from "@/store/store";
import { COPY, type PathId } from "../copy";
import type { ResourceRow } from "../reflect-model";
import { reportFailure } from "./report-failure";
import { extractErrorMessage } from "./session-service";
import type { useReflectionMachine } from "./use-reflection-machine";

type Machine = ReturnType<typeof useReflectionMachine>;

const ACTIVITY: Record<Exclude<PathId, "exit">, Href> = {
	peers: "/peer-reflections",
	solo: "/sit-with-this",
};

export function useWhereNext(m: Machine) {
	const router = useRouter();
	const context = useFullContext();
	const summary = useProfileSummary();
	const updatePreferences = useMutation(api.preferences.update);
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);
	const [heard, setHeard] = useState<Id<"sessions"> | null>(null);
	const endHref = useSessionEndHref(heard);
	const screen = useRef(m.state.screen);
	useEffect(() => {
		screen.current = m.state.screen;
	});
	const busy = useRef(false);

	if (heard && m.state.screen === "error") {
		setHeard(null);
	}

	const [asked, setAsked] = useState(false);
	const [spaceNameOpen, setSpaceNameOpen] = useState(false);
	const prefs = context?.preferences;
	if (
		m.state.screen === "path-selection" &&
		!asked &&
		prefs &&
		!prefs.spaceName &&
		!prefs.spaceNamePromptDismissed
	) {
		setAsked(true);
		setSpaceNameOpen(true);
	}

	const leave = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.dismissTo(LANDING);
		}
	};

	const goPath = async (path: PathId) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		try {
			if (path === "exit") {
				setHeard(m.sessionId);
				await m.handleSelectExit();
				return;
			}
			await (path === "solo" ? m.handleSelectSolo() : m.handleSelectPeers());
			if (screen.current !== "error") {
				router.replace(ACTIVITY[path]);
			}
		} finally {
			busy.current = false;
		}
	};

	return {
		close: () => {
			const writing =
				m.state.screen === "typing" || m.state.screen === "typing-nudge";
			if (writing && m.state.entryText.trim()) {
				toast(COPY.write.draftKept);
			}
			clearReplySeed();
			leave();
		},
		dismissSpaceName: () => {
			setSpaceNameOpen(false);
			updatePreferences({ spaceNamePromptDismissed: true }).catch(
				reportFailure
			);
		},
		finish: () => router.replace(endHref("exit")),
		goPath: (path: PathId) => void goPath(path),
		heard,
		openHelp: () => router.push("/crisis-resources?from=idle_button"),
		openResource: (row: ResourceRow) => {
			if (row.href) {
				Linking.openURL(row.href).catch(reportFailure);
			}
		},
		saveSpaceName: async (name: string): Promise<string | null> => {
			const checked = validateSpaceName(name);
			if (!checked.ok) {
				return checked.message;
			}
			try {
				await updatePreferences({ spaceName: checked.trimmed });
				setSpaceNameOpen(false);
				return null;
			} catch (error) {
				reportFailure(error);
				return extractErrorMessage(error);
			}
		},
		spaceNameOpen,
		stepAway: () => {
			toast(COPY.wait.keepsGoing);
			leave();
		},
		streak: summary?.currentStreak ?? null,
	};
}
