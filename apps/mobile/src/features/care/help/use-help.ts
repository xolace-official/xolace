import { LAST_UPDATED } from "@xolace/backend/convex/lib/crisisResources";
import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { COPY } from "@/features/care/help/copy";
import { detectCountry } from "@/features/care/help/detect-country";
import type { HelpScreenData } from "@/features/care/help/help-data";
import {
	choiceOf,
	countryOf,
	type HelpChoice,
	helpView,
	type LineKind,
} from "@/features/care/help/help-model";
import { openOrSay } from "@/features/care/help/open-line";

const open = (url: string, kind: LineKind) =>
	openOrSay(url, kind, { openURL: Linking.openURL, say: (m) => toast(m) });

export function useHelp(): HelpScreenData {
	const { from } = useLocalSearchParams<{ from?: string }>();
	const posthog = usePostHog();
	const [choice, setChoice] = useState<HelpChoice>(() =>
		choiceOf(detectCountry())
	);
	const view = helpView(choice);
	const capture = (event: string, props: Record<string, string | null>) => {
		try {
			posthog.capture(event, props);
		} catch {}
	};
	const country = countryOf(choice);

	const counted = useRef(false);
	useEffect(() => {
		if (counted.current) {
			return;
		}
		counted.current = true;
		posthog.capture("crisis_resources_opened", {
			country: country ?? "unrecognized",
			entry_point: from ?? "idle_button",
		});
	}, [posthog, country, from]);

	return {
		actions: {
			callEmergency: async () => {
				if (!view.emergency) {
					return;
				}
				const called = await open(`tel:${view.emergency}`, "call");
				if (called) {
					capture("emergency_call_tapped", { country, from: from ?? null });
				}
			},
			choose: setChoice,
			openLine: async (line) => {
				if (!line.action) {
					return;
				}
				await open(line.action.url, line.action.kind);
				capture("crisis_resource_tapped", {
					country,
					from: from ?? null,
					source: line.source,
					type: line.type,
				});
			},
			reportError: async () => {
				await open(`mailto:${COPY.supportEmail}`, "email");
			},
		},
		state: { choice, lastUpdated: LAST_UPDATED, view },
	};
}
