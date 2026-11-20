type IdentitySdk = {
	getAppUserID: () => Promise<string>;
	logIn: (appUserId: string) => Promise<unknown>;
};

export async function logInIfNeeded(
	sdk: IdentitySdk,
	appUserId: string | null
): Promise<void> {
	if (!appUserId || (await sdk.getAppUserID()) === appUserId) {
		return;
	}
	await sdk.logIn(appUserId);
}
