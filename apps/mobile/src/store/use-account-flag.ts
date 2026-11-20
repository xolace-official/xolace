import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { type AccountFlag, hasAccountFlag } from "./account-flags-slice";
import { useAppStore } from "./store";

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

export function useClaimLegacyAccountFlags() {
	const { userId } = useAuth();
	const claim = useAppStore((s) => s.claimLegacyAccountFlags);
	useEffect(() => {
		if (userId) {
			claim(userId);
		}
	}, [userId, claim]);
}
