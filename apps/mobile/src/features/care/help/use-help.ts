/**
 * Get help now's data: the country (the device's region, else "elsewhere"), and production's
 * dialer, mail and link handling with its toasts and PostHog events. `from` names the screen that
 * sent the person here (talk, library, quote_reply…).
 */
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
	countryOf,
	failureOf,
	type HelpChoice,
	helpView,
	type LineKind,
} from "@/features/care/help/help-model";

/** Opens `url`, or says why it couldn't. True once the system took it. */
async function open(url: string, kind: LineKind): Promise<boolean> {
	const { cannot, failed } = failureOf(kind);
	let canOpen = false;
	try {
		canOpen = await Linking.canOpenURL(url);
	} catch {
		canOpen = false;
	}
	if (!canOpen) {
		toast(cannot);
		return false;
	}
	try {
		await Linking.openURL(url);
	} catch {
		toast(failed);
	}
	return true;
}

export function useHelp(): HelpScreenData {
	const { from } = useLocalSearchParams<{ from?: string }>();
	const posthog = usePostHog();
	const [choice, setChoice] = useState<HelpChoice>(
		() => detectCountry() ?? "elsewhere"
	);
	const view = helpView(choice);
	const country = countryOf(choice);

	// Once, with the country it opened on (the menu may change it later).
	const opened = useRef(false);
	useEffect(() => {
		if (opened.current) {
			return;
		}
		opened.current = true;
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
				const opened = await open(`tel:${view.emergency}`, "call");
				if (opened) {
					posthog.capture("emergency_call_tapped", {
						country,
						from: from ?? null,
					});
				}
			},
			choose: setChoice,
			openLine: async (line) => {
				if (!line.action) {
					return;
				}
				posthog.capture("crisis_resource_tapped", {
					country,
					from: from ?? null,
					source: line.source,
					type: line.type,
				});
				await open(line.action.url, line.action.kind);
			},
			reportError: async () => {
				await open(`mailto:${COPY.supportEmail}`, "email");
			},
		},
		state: { choice, lastUpdated: LAST_UPDATED, view },
	};
}
