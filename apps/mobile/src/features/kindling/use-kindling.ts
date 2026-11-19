import { useNetInfo } from "@react-native-community/netinfo";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { useNavigation, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { goHome } from "@/lib/landing";
import { trackLibrary } from "@/lib/library-analytics";
import { COPY } from "./copy";
import type { Kindling } from "./kindling-data";
import {
	type ActiveKindling,
	heldOn,
	keptView,
	trailView,
} from "./kindling-model";
import { twigBrowseHref, twigHref, twigSlug } from "./twig-links";
import { useXolacerMatch } from "./use-xolacer-match";

const report = (error: unknown) => Sentry.captureException(error);
const tryAgain = (label: string) =>
	toast(label, { description: COPY.toast.again, variant: "danger" });

/** The kindling screen on Convex (paths-v1 §9, handoff §1): reads, sends, analytics, toasts. */
export function useKindlingData(): Kindling {
	const router = useRouter();
	const navigation = useNavigation();
	const posthog = usePostHog();
	const offline = useNetInfo().isConnected === false;
	const active = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});
	// The last live kindling, so the visit keeps it once its last twig settles (§5).
	const [last, setLast] = useState<ActiveKindling | null>(null);
	if (active && active !== last) {
		setLast(active);
	}
	const latest = useQuery(
		api.paths.getLatest,
		active === null && last ? {} : "skip"
	);
	const view = keptView(active, last ? trailView(last) : null, latest);
	const completeStep = useMutation(api.paths.completeStep);
	const skipStep = useMutation(api.paths.skipStep);
	const dismiss = useMutation(api.paths.dismiss);
	const xolacer = useXolacerMatch();

	// Once per kindling, not per re-render of the subscription.
	const opened = useRef<string | null>(null);
	useEffect(() => {
		if (!last || opened.current === last._id) {
			return;
		}
		opened.current = last._id;
		posthog.capture("path_opened", { pathId: last._id });
		for (const twig of last.twigs) {
			const slug = twigSlug(twig);
			if (twig.kind === "read" && slug) {
				trackLibrary(posthog, "library_twig_shown", {
					slug,
					state: twig.state,
				});
			}
		}
	}, [last, posthog]);

	const twigOf = (id: string) => last?.twigs.find((t) => t._id === id);

	const open = async (id: string, again: boolean) => {
		const twig = twigOf(id);
		if (!(last && twig) || xolacer.pendingId) {
			return;
		}
		const href =
			twig.kind === "xolacer"
				? await xolacer.resolve(twig, last.sessionId)
				: twigHref(twig, last.sessionId);
		// The match can land after Back or Put out: don't pull them somewhere they left.
		if (!navigation.isFocused()) {
			return;
		}
		if (!href) {
			toast(COPY.toast.notReady, { description: COPY.toast.notReadyBody });
			return;
		}
		if (!again) {
			posthog.capture("step_started", {
				actionType: twig.actionType,
				pathId: last._id,
			});
		}
		router.push(href);
	};

	/** Sends a twig's state; a twig this visit doesn't know is a no. */
	const send = async (
		id: string,
		run: (stepId: ActiveKindling["twigs"][number]["_id"]) => Promise<unknown>,
		label: string
	): Promise<boolean> => {
		const twig = twigOf(id);
		if (!twig) {
			return false;
		}
		try {
			await run(twig._id);
			return true;
		} catch (error) {
			report(error);
			tryAgain(label);
			return false;
		}
	};

	let status: Kindling["state"]["status"] = "ready";
	if (view === undefined) {
		status = offline ? "offline" : "loading";
	} else if (view === null) {
		status = "none";
	}

	return {
		actions: {
			// Today itself, not the screen below: arriving from You would land on Steadiness.
			back: goHome,
			browse: (id) => {
				const twig = twigOf(id);
				const href = twig ? twigBrowseHref(twig) : null;
				// Lands Explore's home under the topic, so back and a tab re-tap reach it.
				if (href) {
					router.push(href, { withAnchor: true });
				}
			},
			open: (id, again) => {
				open(id, again).catch(report);
			},
			putOut: () => {
				if (!last) {
					return;
				}
				// Home before the read flips to null, so the empty state never flashes; Today's card
				// then crossfades to "none right now". Today itself, as Back to Today goes: arriving
				// from You would otherwise land on Steadiness.
				goHome();
				dismiss({ pathId: last._id }).catch((error: unknown) => {
					report(error);
					tryAgain(COPY.toast.putOut);
				});
			},
			skip: (id) => send(id, (stepId) => skipStep({ stepId }), COPY.toast.skip),
			tend: (id) =>
				send(id, (stepId) => completeStep({ stepId }), COPY.toast.mark),
		},
		state: {
			held: view ? heldOn(view.generatedAt, Date.now()) : COPY.lastSession,
			matching: xolacer.pendingId,
			status,
			view: view ?? null,
		},
	};
}
