export type ConnectPlanInput = {
	cachedEnabled: boolean;
	cachedCredential: { clerkUserId: string } | null;
	liveStatus: boolean | undefined;
	clerkUserId: string | null;
};

export type ConnectPlan = {
	activateNow: boolean;
	resetDb: boolean;
	clearCredential: boolean;
};

export function connectPlan(input: ConnectPlanInput): ConnectPlan {
	const { cachedEnabled, cachedCredential, liveStatus, clerkUserId } = input;

	const foreign =
		cachedCredential !== null && cachedCredential.clerkUserId !== clerkUserId;
	if (foreign) {
		return { activateNow: false, clearCredential: true, resetDb: true };
	}
	if (clerkUserId === null) {
		return { activateNow: false, clearCredential: false, resetDb: false };
	}

	if (liveStatus === false) {
		return { activateNow: false, clearCredential: false, resetDb: false };
	}
	if (liveStatus === true) {
		return { activateNow: true, clearCredential: false, resetDb: false };
	}

	return {
		activateNow: cachedEnabled && cachedCredential !== null,
		clearCredential: false,
		resetDb: false,
	};
}
