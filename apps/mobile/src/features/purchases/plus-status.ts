export type PlusStatus = "loading" | "plus" | "free";

export function plusStatus(s: {
	authLoading: boolean;
	signedIn: boolean;
	serverPlus: boolean | undefined;
	storePlus: boolean;
	storeLoading: boolean;
}): PlusStatus {
	if (s.serverPlus === true || s.storePlus) {
		return "plus";
	}
	const bothAnswered = s.serverPlus !== undefined && !s.storeLoading;
	return !s.authLoading && s.signedIn && bothAnswered ? "free" : "loading";
}
