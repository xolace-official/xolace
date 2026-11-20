import { api } from "@xolace/backend/api";
import { useConvex, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import {
	PRIVACY_COPY as C,
	type Retention,
} from "@/features/settings/privacy/copy";
import type { Privacy } from "@/features/settings/privacy/privacy-data";
import {
	askAfterCount,
	memoryOn,
	type PastRetention,
	retentionPick,
} from "@/features/settings/privacy/privacy-model";
import type { ComposedSwitch } from "@/features/settings/settings-switch-row";
import { saveFailed } from "@/features/settings/use-save-failed";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export function usePrivacy(letters: ComposedSwitch): Privacy {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const applyRetentionNow = useMutation(
		api.privacy.retention.applyRetentionNow
	);
	const convex = useConvex();
	const [pending, setPending] = useState<Retention | null>(null);
	const [past, setPast] = useState<PastRetention | null>(null);
	const [applying, setApplying] = useState(false);
	const [policyOpen, setPolicyOpen] = useState(false);
	const asked = useRef(0);

	const retention: Retention =
		preferences?.dataRetentionPreference ?? "indefinite";

	const clearPending = () => {
		asked.current += 1;
		setPending(null);
		setPast(null);
	};

	const save = (to: Retention) => {
		updatePreferences({ dataRetentionPreference: to }).catch(saveFailed);
	};

	const count = async (to: Retention) => {
		asked.current += 1;
		const ask = asked.current;
		setPending(to);
		setPast(null);
		try {
			const result = await convex.query(
				api.privacy.retention.countSessionsPastRetention,
				{ retention: to }
			);
			if (asked.current !== ask) {
				return;
			}
			if (askAfterCount(result)) {
				setPast(result);
				return;
			}
			save(to);
			setPending(null);
		} catch {
			if (asked.current === ask) {
				setPending(null);
				saveFailed();
			}
		}
	};

	return {
		actions: {
			cancelRetention: clearPending,
			closePolicy: () => setPolicyOpen(false),
			confirmRetention: () => {
				if (!pending || applying) {
					return;
				}
				setApplying(true);
				applyRetentionNow({ preference: pending })
					.catch(saveFailed)
					.finally(() => {
						setApplying(false);
						clearPending();
					});
			},
			openCopy: () => {
				Linking.openURL(C.copyUrl).catch(() => undefined);
			},
			openDelete: (kind) => {
				router.push({ params: { kind }, pathname: "/settings/delete" });
			},
			openPolicy: () => setPolicyOpen(true),
			pickRetention: (to) => {
				if (preferences === undefined || applying) {
					return;
				}
				const pick = retentionPick(retention, to);
				if (pick === "count") {
					count(to).catch(() => undefined);
					return;
				}
				clearPending();
				if (pick === "save") {
					save(to);
				}
			},
			setMemory: (on) => {
				updatePreferences({ personalMemoryEnabled: on }).catch(saveFailed);
			},
			setReceiveLetters: (on) => letters?.set(on),
			setShare: (on) => {
				updatePreferences({ contributeByDefault: on }).catch(saveFailed);
			},
		},
		state: {
			applying,
			loading: preferences === undefined,
			memory: memoryOn(preferences?.personalMemoryEnabled),
			past,
			pending,
			policyOpen,
			receiveLetters: letters ? letters.on : null,
			retention,
			share: preferences?.contributeByDefault ?? false,
		},
	};
}
