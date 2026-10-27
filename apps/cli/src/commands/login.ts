import { isRemoteSession, openBrowser } from "../auth/browser";
import { listenForCode } from "../auth/loopback";
import {
	authorizeUrl,
	createPkce,
	exchangeCode,
	pollDeviceToken,
	startDeviceAuthorization,
	type Tokens,
} from "../auth/oauth";
import type { TokenStore } from "../auth/token-store";
import type { CliConfig } from "../config";
import { convexErrorCode, describeMe, fetchMe, NO_ACCOUNT_MESSAGE } from "./me";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

type Write = (text: string) => void;

const browserLogin = async (config: CliConfig, write: Write) => {
	const { challenge, state, verifier } = createPkce();
	const listener = listenForCode({ state, timeoutMs: LOGIN_TIMEOUT_MS });
	try {
		const url = authorizeUrl(config, {
			challenge,
			redirectUri: listener.redirectUri,
			state,
		}).toString();
		const opened = await openBrowser(url);
		write(
			opened
				? `Opened your browser to sign in. If nothing appeared, visit:\n${url}\n`
				: `Visit this URL to sign in:\n${url}\n`
		);
		return await exchangeCode(config, {
			code: await listener.code,
			redirectUri: listener.redirectUri,
			verifier,
		});
	} finally {
		listener.stop();
	}
};

const deviceLogin = async (config: CliConfig, write: Write) => {
	const device = await startDeviceAuthorization(config);
	write(
		`On any device, open ${device.verificationUri} and enter the code:\n\n    ${device.userCode}\n\n`
	);
	if (device.verificationUriComplete) {
		write(`Or open ${device.verificationUriComplete}\n`);
	}
	write("Waiting for you to approve...\n");
	return pollDeviceToken(config, device);
};

export const login = async ({
	config,
	device = isRemoteSession(),
	store,
	write,
}: {
	config: CliConfig;
	device?: boolean;
	store: TokenStore;
	write: Write;
}) => {
	const tokens: Tokens = device
		? await deviceLogin(config, write)
		: await browserLogin(config, write);
	if (!tokens.refreshToken) {
		throw new Error(
			"Clerk issued no refresh token. Check the OAuth app has the offline_access scope."
		);
	}
	await store.save({
		idToken: tokens.idToken,
		refreshToken: tokens.refreshToken,
	});

	try {
		write(`${describeMe(await fetchMe(config.convexUrl, tokens.idToken))}\n`);
	} catch (error) {
		if (convexErrorCode(error) !== "user_not_found") {
			throw error;
		}
		write(`Signed in. ${NO_ACCOUNT_MESSAGE}\n`);
	}
};
