import type { Session } from "../auth/session";
import type { CliConfig } from "../config";
import { convexErrorCode, describeMe, fetchMe, NO_ACCOUNT_MESSAGE } from "./me";

export const whoami = async ({
	config,
	session,
	write,
}: {
	config: CliConfig;
	session: Session;
	write: (text: string) => void;
}) => {
	const idToken = await session.getIdToken();
	try {
		const me = await fetchMe(config.convexUrl, idToken);
		write(`${describeMe(me)}\nUser ID: ${me.userId}\n`);
	} catch (error) {
		if (convexErrorCode(error) !== "user_not_found") {
			throw error;
		}
		write(`${NO_ACCOUNT_MESSAGE}\n`);
	}
};
