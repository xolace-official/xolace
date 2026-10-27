/**
 * A one-shot HTTP server on 127.0.0.1 that catches the OAuth redirect. Clerk
 * ignores the port on loopback redirects (RFC 8252 §7.3), so when the registered
 * port is taken any free one works.
 */
import { serve } from "bun";

export const PREFERRED_PORT = 53_682;
const CALLBACK_PATH = "/callback";
const HOST = "127.0.0.1";
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

export interface LoopbackListener {
	/** Resolves with the authorization code, or rejects on error, bad state or timeout. */
	code: Promise<string>;
	redirectUri: string;
	stop: () => void;
}

const page = (message: string, status = 200) =>
	new Response(`${message}\n`, {
		// One request per server: don't leave the browser a keep-alive socket to it.
		headers: {
			connection: "close",
			"content-type": "text/plain; charset=utf-8",
		},
		status,
	});

export const listenForCode = ({
	port = PREFERRED_PORT,
	state,
	timeoutMs,
}: {
	port?: number;
	state: string;
	timeoutMs: number;
}): LoopbackListener => {
	const { promise: code, reject, resolve } = Promise.withResolvers<string>();

	const handle = (request: Request) => {
		const url = new URL(request.url);
		if (url.pathname !== CALLBACK_PATH) {
			return page("Not found", HTTP_NOT_FOUND);
		}
		const error = url.searchParams.get("error");
		const received = url.searchParams.get("code");
		// Not our redirect: any page in the browser can hit this known port. Refuse
		// it but keep waiting, so a stray request can't cancel the real sign-in.
		if (url.searchParams.get("state") !== state) {
			return page("Unexpected sign-in request.", HTTP_BAD_REQUEST);
		}
		if (error || !received) {
			reject(new Error(`Sign-in failed: ${error ?? "no code returned"}.`));
			return page("Sign-in failed. Return to the terminal.", HTTP_BAD_REQUEST);
		}
		resolve(received);
		return page("Signed in to Xolace. You can close this tab.");
	};

	const listen = (onPort: number) =>
		serve({ fetch: handle, hostname: HOST, port: onPort });
	let server: ReturnType<typeof listen>;
	try {
		server = listen(port);
	} catch {
		server = listen(0);
	}

	const timer = setTimeout(() => {
		reject(new Error("Timed out waiting for the browser sign-in."));
	}, timeoutMs);
	// Not `stop(true)`: let the reply to the browser finish sending.
	const stop = () => {
		clearTimeout(timer);
		server.stop();
	};
	code.then(stop, stop);

	return {
		code,
		redirectUri: `http://${HOST}:${server.port}${CALLBACK_PATH}`,
		stop,
	};
};
