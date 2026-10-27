import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { api } from "@xolace/backend/api";
import {
	ConvexProviderWithAuth,
	type ConvexReactClient,
	useConvexAuth,
	useQueries,
} from "convex/react";
import type { ReactNode } from "react";
import type { Session } from "../auth/session";
import {
	convexErrorCode,
	describeMe,
	type Me,
	NO_ACCOUNT_MESSAGE,
} from "../commands/me";

type UseAuth = () => {
	fetchAccessToken: Session["fetchToken"];
	isAuthenticated: boolean;
	isLoading: boolean;
};

// OpenTUI's JSX namespace has no ElementType, so TS rejects React.FC components
// (their return may be a Promise). Runtime is fine; re-type it as a plain one.
const Provider = ConvexProviderWithAuth as (props: {
	children?: ReactNode;
	client: ConvexReactClient;
	useAuth: UseAuth;
}) => ReactNode;

/**
 * The hook ConvexProviderWithAuth reads auth from. The CLI checks for a stored
 * sign-in before rendering, so it starts out signed in; if a refresh later fails,
 * fetchToken returns null and useConvexAuth turns false.
 */
export const authHookFor =
	(fetchToken: Session["fetchToken"]): UseAuth =>
	() => ({
		fetchAccessToken: fetchToken,
		isAuthenticated: true,
		isLoading: false,
	});

// useQueries resubscribes whenever the request object's identity changes, so a
// literal built during render loops forever. Keep both requests at module level.
const ME_QUERY = { me: { args: {}, query: api.users.getMe } };
const NO_QUERIES = {};

/** What the home screen shows: loading, an error, or the live `getMe` result. */
export type MeState =
	| { kind: "loading" }
	| { kind: "no-account" }
	| { kind: "error"; message: string }
	| { kind: "ready"; me: Me };

export const toMeState = (result: unknown): MeState => {
	if (result === undefined) {
		return { kind: "loading" };
	}
	if (result instanceof Error) {
		return convexErrorCode(result) === "user_not_found"
			? { kind: "no-account" }
			: { kind: "error", message: result.message };
	}
	// useQueries can't carry per-key types; the value is getMe's validated return.
	return { kind: "ready", me: result as Me };
};

export function HomeView({ state }: { state: MeState }) {
	let line: string;
	if (state.kind === "loading") {
		line = "Loading your account...";
	} else if (state.kind === "no-account") {
		line = NO_ACCOUNT_MESSAGE;
	} else if (state.kind === "error") {
		line = `Something went wrong: ${state.message}`;
	} else {
		line = describeMe(state.me);
	}
	return (
		<box flexDirection="column" flexGrow={1} padding={1}>
			<ascii-font font="tiny" text="Xolace" />
			<text>{line}</text>
			<text attributes={TextAttributes.DIM}>
				Live: change your name in the app and it updates here. Press q to quit.
			</text>
		</box>
	);
}

function Home() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { me } = useQueries(isAuthenticated ? ME_QUERY : NO_QUERIES);
	if (!(isLoading || isAuthenticated)) {
		return (
			<HomeView
				state={{
					kind: "error",
					message: "Your sign-in expired. Quit and run `xolace login`.",
				}}
			/>
		);
	}
	return <HomeView state={toMeState(me)} />;
}

function QuitOnQ() {
	const renderer = useRenderer();
	useKeyboard((key) => {
		if (key.name === "q") {
			renderer.destroy();
		}
	});
	return null;
}

export function App({
	client,
	useAuth,
}: {
	client: ConvexReactClient;
	useAuth: UseAuth;
}) {
	return (
		<Provider client={client} useAuth={useAuth}>
			<QuitOnQ />
			<Home />
		</Provider>
	);
}
