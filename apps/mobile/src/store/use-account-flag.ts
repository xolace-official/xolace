import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { type AccountFlag, hasAccountFlag } from "./account-flags-slice";
import { useAppStore } from "./store";

/** A one-time flag for the signed-in account, and the function that sets it. With no account
 * (mid sign-out) it reads as set: there is nobody to ask, or to record an answer against. */
export function useAccountFlag(flag: AccountFlag) {
	const { userId } = useAuth();
	const isSet = useAppStore((s) => !userId || hasAccountFlag(s, userId, flag));
	const markAccountFlag = useAppStore((s) => s.markAccountFlag);
	const mark = () => {
		if (userId) {
			markAccountFlag(userId, flag);
		}
	};
	return [isSet, mark] as const;
}

/** Gives the device's pre-per-account marks to whoever is signed in after the update. */
export function useClaimLegacyAccountFlags() {
	const { userId } = useAuth();
	const claim = useAppStore((s) => s.claimLegacyAccountFlags);
	useEffect(() => {
		if (userId) {
			claim(userId);
		}
	}, [userId, claim]);
}
