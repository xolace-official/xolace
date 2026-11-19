import { type ComponentType, createElement } from "react";
import { ArrivalsHost } from "@/features/achievements/arrival/arrivals-host";
import { AgeAskHost } from "@/features/connect/age-gate/age-ask-host";
import { LateRiskHost } from "@/features/letters/late-risk-host";
import { isPresentedRoute } from "@/features/navigation/presented-routes";
import { GoneHost } from "@/features/peer-reflection/gone-host";
import { NowPlayingHost } from "@/features/player/now-playing/now-playing-host";

/**
 * A host: a component the `(protected)` layout keeps mounted above its stack
 * for as long as someone is signed in, whatever screen is up. It is not a
 * route: nothing navigates to it, it has no URL and no stack options. It
 * listens (a store, a subscription, the app coming to the front) and either
 * renders nothing or draws over every screen: the arrivals moment, a letter
 * that just arrived.
 *
 * Hosts are React Native siblings after the native stack, so they draw over
 * the stack's ordinary screens only: never over a natively presented one (the
 * `fullScreenModal` player, a form sheet). One that draws positions itself
 * absolutely (`absolute inset-0`, or pinned to an edge) and lets touches through
 * where it draws nothing (`pointerEvents="box-none"`).
 *
 * A screen goes in its feature's `screens.ts` instead (spread by
 * `root-screens.ts`): a route in the stack, opened by navigating to it, with
 * its own options. A host that opens a screen does it by navigating to that
 * route, so the screen still lives in `screens.ts`.
 */
export type RootHost = {
	/** Unique; the React key. */
	readonly name: string;
	readonly Host: ComponentType;
};

/**
 * Every host a feature adds, mounted in this order after the stack (so later
 * ones draw on top). A feature exports its host from its own folder and adds one
 * entry here; nobody edits the layout's lines. Hosts that predate the list
 * (presence, the badge unlock) stay in the layout until the screen PR that
 * replaces them moves them here.
 */
/** The arrival, told which routes are natively presented (it would play unseen behind them). */
function Arrivals() {
	return createElement(ArrivalsHost, { isPresented: isPresentedRoute });
}

/** Letters' late-risk care, which waits while a native presentation would hide it. */
function LateRisk() {
	return createElement(LateRiskHost, { isPresented: isPresentedRoute });
}

export const ROOT_HOSTS: readonly RootHost[] = [
	// A badge's arrival and the streak milestone, drawn over every screen (S6).
	{ Host: Arrivals, name: "arrivals" },
	// Clears the peer reflections you put away when you sign out (S15).
	{ Host: GoneHost, name: "peer-reflections-gone" },
	// The now-playing track's audio and its sleep timer, kept above every screen (S10).
	{ Host: NowPlayingHost, name: "now-playing" },
	// The date-of-birth ask for Letters' opt-in and send, which can't draw Connect's (S21).
	{ Host: AgeAskHost, name: "age-ask" },
	// A late re-check's care for a letter that read as sent, at the next open (S21).
	{ Host: LateRisk, name: "letters-late-risk" },
];
