import { api } from "@xolace/backend/convex/_generated/api";
import { useAction } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useReducer, useRef, useState } from "react";
import { Linking } from "react-native";
import {
	deviceRegion,
	TELEGRAM_OUTREACH_CONSENT_VERSION,
} from "@/features/reach-me-on/link-consent";
import {
	canReuseLink,
	isLinking,
	type LinkStep,
	linkFlow,
	linkMsLeft,
	shareInFlight,
} from "@/features/reach-me-on/link-flow";
import type { ChannelEntry } from "@/features/reach-me-on/reach-view";
import { convexErrorCode } from "@/lib/convex-error-code";

type LinkSource = "settings" | "offer_card";
type Minted = { url: string; at: number };

const CONFIRMATION_MS = 4000;

function mintFailure(error: unknown): string {
	switch (convexErrorCode(error)) {
		case "telegram_unavailable":
			return "Telegram isn't available for check-ins right now.";
		case "rate_limited":
			return "That's a lot of links in a short time. Try again in a few minutes.";
		default:
			return "Couldn't make a link. Check your connection and try again.";
	}
}

export function useTelegramLink(
	telegram: ChannelEntry | undefined,
	source: LinkSource = "settings"
) {
	const createLink = useAction(api.outreach.telegram.link.createLink);
	const posthog = usePostHog();
	const { toast } = useToast();
	const [step, dispatch] = useReducer(linkFlow, "idle");
	const [minting, setMinting] = useState(false);
	const minted = useRef<Minted | null>(null);
	const inFlight = useRef<Promise<Minted | null>>(null);
	const [handedOffAt, setHandedOffAt] = useState<number | null>(null);
	const attempt = useRef(0);
	const stepRef = useRef<LinkStep>(step);
	useEffect(() => {
		stepRef.current = step;
	}, [step]);

	const linked = telegram?.linked ?? false;
	useEffect(() => {
		dispatch({ linked, type: "channel_changed" });
	}, [linked]);

	useEffect(() => {
		if (step !== "linked") {
			return;
		}
		minted.current = null;
		const timer = setTimeout(
			() => dispatch({ type: "dismiss" }),
			CONFIRMATION_MS
		);
		return () => clearTimeout(timer);
	}, [step]);

	useEffect(() => {
		if (step !== "waiting" || handedOffAt === null) {
			return;
		}
		const timer = setTimeout(
			() => dispatch({ type: "link_expired" }),
			Math.max(0, linkMsLeft(handedOffAt, Date.now()))
		);
		return () => clearTimeout(timer);
	}, [step, handedOffAt]);

	useEffect(
		() => () => {
			const left = stepRef.current;
			if (isLinking(left)) {
				posthog.capture("channel_link_abandoned", {
					channel: "telegram",
					step: left,
				});
			}
		},
		[posthog]
	);

	const mintFresh = async (): Promise<Minted | null> => {
		setMinting(true);
		try {
			const regionCode = deviceRegion();
			const url = await createLink({
				consentLanguageVersion: TELEGRAM_OUTREACH_CONSENT_VERSION,
				source,
				...(regionCode && { regionCode }),
			});
			minted.current = { at: Date.now(), url };
			return minted.current;
		} catch (error) {
			toast.show({ label: mintFailure(error), variant: "danger" });
			return null;
		} finally {
			setMinting(false);
		}
	};

	const mint = (): Promise<Minted | null> => {
		const cached = minted.current;
		if (cached && canReuseLink(cached.at, Date.now())) {
			return Promise.resolve(cached);
		}
		return shareInFlight(inFlight, mintFresh);
	};

	const start = () => {
		posthog.capture("channel_link_started", {
			channel: "telegram",
			relink: telegram?.status === "disconnected",
			source,
		});
		dispatch({ type: "start" });
	};

	const handOff = (link: Minted) => {
		setHandedOffAt(link.at);
		dispatch({ type: "link_handed_off" });
	};

	const openTelegram = async () => {
		const mine = attempt.current;
		const link = await mint();
		if (!link || attempt.current !== mine) {
			return;
		}
		try {
			await Linking.openURL(link.url);
			handOff(link);
		} catch {
			toast.show({
				description: "Copy the link and open it where Telegram is installed.",
				label: "Couldn't open Telegram",
				variant: "warning",
			});
		}
	};

	const copyLink = async () => {
		const mine = attempt.current;
		const link = await mint();
		if (!link || attempt.current !== mine) {
			return;
		}
		await Clipboard.setStringAsync(link.url);
		posthog.capture("channel_link_copied", { channel: "telegram" });
		handOff(link);
		toast.show({
			description: "Open it in Telegram on your other device. It works once.",
			label: "Link copied",
		});
	};

	const cancel = () => {
		attempt.current += 1;
		if (isLinking(step)) {
			posthog.capture("channel_link_abandoned", { channel: "telegram", step });
		}
		dispatch({ type: "cancel" });
	};

	return {
		cancel,
		copyLink,
		dismiss: () => dispatch({ type: "dismiss" }),
		minting,
		openTelegram,
		start,
		step,
	};
}
