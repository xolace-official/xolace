import { spawn } from "node:child_process";

const openerFor = (url: string): [string, string[]] => {
	if (process.platform === "darwin") {
		return ["open", [url]];
	}
	if (process.platform === "win32") {
		// `start`'s first quoted argument is the window title.
		return ["cmd", ["/c", "start", '""', url.replaceAll("&", "^&")]];
	}
	return ["xdg-open", [url]];
};

/** Resolves false when no browser opener could run; the caller prints the URL anyway. */
export const openBrowser = (url: string) =>
	new Promise<boolean>((resolve) => {
		const [command, args] = openerFor(url);
		const child = spawn(command, args, { detached: true, stdio: "ignore" });
		child.on("error", () => resolve(false));
		child.on("spawn", () => {
			child.unref();
			resolve(true);
		});
	});

/** Over SSH a browser would open on the wrong machine, so default to the device flow. */
export const isRemoteSession = (
	env: Record<string, string | undefined> = process.env
) => Boolean(env.SSH_CONNECTION || env.SSH_TTY);
