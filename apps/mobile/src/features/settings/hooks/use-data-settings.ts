import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRef } from "react";
import { wipeReflectDraft } from "@/features/reflect/reflect-draft";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export type RetentionOption = "indefinite" | "6_months" | "1_year";

export const useDataSettings = () => {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const requestDataWipe = useMutation(api.users.requestDataWipe);
	const requestDeletion = useMutation(api.users.requestDeletion);
	const { signOut } = useAuth();
	const deletionRequested = useRef(false);

	const contributeAnonymously = preferences?.contributeByDefault ?? false;
	// On by default (undefined = true), see Cognition Layer §1.1b.
	const personalMemory = preferences?.personalMemoryEnabled !== false;
	const retention: RetentionOption =
		preferences?.dataRetentionPreference ?? "indefinite";

	const retentionDisplay =
		retention === "indefinite"
			? "Indefinite"
			: retention === "6_months"
				? "6 months"
				: "1 year";

	const setContributeAnonymously = (v: boolean) => {
		updatePreferences({ contributeByDefault: v });
	};

	const setPersonalMemory = (v: boolean) => {
		updatePreferences({ personalMemoryEnabled: v });
	};

	const setRetention = (value: RetentionOption) => {
		updatePreferences({ dataRetentionPreference: value });
	};

	const performDeleteData = async () => {
		await requestDataWipe();
		await wipeReflectDraft();
	};

	const performDeleteAccount = async () => {
		// A previous attempt may have deleted and then failed at sign-out;
		// re-running would throw account_inactive from requireAuth.
		if (!deletionRequested.current) {
			await requestDeletion();
			deletionRequested.current = true;
		}
		// The patch invalidates every requireAuth-gated subscription, so the
		// session must go. A failure propagates to the confirm dialog's toast.
		await signOut();
	};

	return {
		contributeAnonymously,
		performDeleteAccount,
		performDeleteData,
		personalMemory,
		retention,
		retentionDisplay,
		setContributeAnonymously,
		setPersonalMemory,
		setRetention,
	};
};
