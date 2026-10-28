import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, {
	Easing,
	FadeOut,
	FadeOutDown,
	LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { useSessionEndHref } from "@/features/kindling/use-session-end-href";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusOffer } from "@/features/purchases/use-plus-offer";
import { PathChoiceCard } from "@/features/reflect/components/states/path-choice-card";
import { PathOfferLayer } from "@/features/reflect/components/states/path-offer-layer";
import { playPathChoice } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";

type Props = {
	sessionId: string | null;
	/**
	 * The mirror this was affirmed on actually named something. False when it
	 * only reached for what the words did not hold, or when the turn cap
	 * collapsed the row so "That's it" was the only thing left to press —
	 * neither is a landing, and moment 2 is only for a landing.
	 */
	mirrorLanded: boolean;
	onSelectSolo: () => Promise<void>;
	onSelectPeers: () => Promise<void>;
	onSelectExit: () => Promise<void>;
};

const FLUX_MAP = require("@/assets/images/flux/flux-map.png");
const FLUX_MAP_STYLE = { height: 186, width: 132 };
/** Flux steps back while the offer layer takes the top of the stack. */
const FLUX_MAP_SMALL = { height: 101, width: 72 };
const FILL = { height: "100%" as const, width: "100%" as const };
const GROW = { flexGrow: 1 };
const LAST_TINT = "bg-accent/15";
/** Flux and his bubble resize when the offer arrives late or is declined. */
const REFLOW = LinearTransition.duration(280).easing(
	Easing.bezier(0.77, 0, 0.175, 1)
);
const OFFER_OUT = FadeOutDown.duration(200).easing(
	Easing.bezier(0.23, 1, 0.32, 1)
);
const OFFER_OUT_REDUCED = FadeOut.duration(150);

const PATHS = [
	{
		image: require("@/assets/images/flux/flux-campfire.png"),
		key: "solo",
		sub: "A quiet space to breathe",
		tint: "bg-ember/25",
		title: "Sit with this",
	},
	{
		image: require("@/assets/images/flux/flux-pair-listening.png"),
		key: "peers",
		sub: "See what others have shared",
		tint: "bg-frost/20",
		title: "You're not alone",
	},
	{
		image: require("@/assets/images/flux/flux-whisper.png"),
		key: "exit",
		sub: "Return to the beginning",
		tint: LAST_TINT,
		title: "I just needed to say it",
	},
] as const;

export const PathSelectionState = ({
	sessionId,
	mirrorLanded,
	onSelectSolo,
	onSelectPeers,
	onSelectExit,
}: Props) => {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const reflow = reduced ? undefined : REFLOW;
	const busyRef = useRef(false);
	const openPaywall = usePaywall((s) => s.open);
	const afterPath = useSessionEndHref(sessionId);
	// Moment 2 (#221 §4). This screen IS the beat — the user has just said the
	// mirror landed. It runs on its own call site rather than waiting for
	// session end, and spends the same one-offer-per-session budget, so a
	// session that offers here offers nothing at its close.
	const [declined, setDeclined] = useState(false);
	const plusOffer = usePlusOffer("mirror_landed", {
		enabled: mirrorLanded,
		sessionId,
	});

	// `href` is read by the caller before `select` runs: exit's must be, since
	// completing the session nulls getActive (see useSessionEndHref).
	const choose = async (select: () => Promise<void>, href: Href) => {
		if (busyRef.current) {
			return;
		}
		busyRef.current = true;
		playPathChoice();
		try {
			await select();
		} catch (e) {
			if (__DEV__) {
				console.error("[PathSelection] select failed:", e);
			}
			busyRef.current = false;
			return;
		}
		try {
			router.replace(href);
		} catch {
			// non-fatal nav error
		} finally {
			busyRef.current = false;
		}
	};

	const select = {
		// Exit has no activity, so the kindling announcement (when due) sits
		// right after the path choice.
		exit: () => choose(onSelectExit, afterPath("exit")),
		peers: () => choose(onSelectPeers, "/peer-reflections"),
		solo: () => choose(onSelectSolo, "/sit-with-this"),
	};

	const offering = plusOffer !== null && !declined;

	// Scrolls only when the stack outgrows the screen (short device, large
	// text, offer on top); otherwise flexGrow keeps Flux filling the space.
	return (
		<ScrollView
			bounces={false}
			contentContainerStyle={GROW}
			overScrollMode="never"
			showsVerticalScrollIndicator={false}
		>
			{/* Flux asks; the question floats up-right of his head with a tail back
          to him, so it reads as him speaking, not a card beside him. */}
			<View
				className={cn(
					"flex-1 flex-row items-end px-5 pt-2",
					offering ? "pb-12" : "pb-16"
				)}
			>
				<Animated.View
					layout={reflow}
					style={offering ? FLUX_MAP_SMALL : FLUX_MAP_STYLE}
				>
					<Image
						accessibilityLabel="Flux, holding a map"
						contentFit="contain"
						source={FLUX_MAP}
						style={FILL}
					/>
				</Animated.View>
				<Animated.View
					className={cn("ml-1 flex-1", offering ? "mb-20" : "mb-32")}
					layout={reflow}
				>
					<View
						className={cn(
							"rounded-3xl bg-surface shadow-sm",
							offering ? "px-4 py-3" : "px-5 py-4"
						)}
					>
						<AppText
							className={cn(
								"font-medium text-foreground",
								offering ? "text-lg" : "text-2xl leading-8"
							)}
						>
							Where to from here?
						</AppText>
						<AppText className="mt-1 text-foreground/50 text-sm">
							Pick whichever feels right.
						</AppText>
					</View>
					<View className="absolute -bottom-1.5 left-3 h-4 w-4 rotate-45 rounded-sm bg-surface" />
				</Animated.View>
			</View>

			{/* The offer is the stack's top layer, not a replacement for the
          question: the three paths stay on screen and one tap away. */}
			{offering ? (
				<Animated.View exiting={reduced ? OFFER_OUT_REDUCED : OFFER_OUT}>
					<PathOfferLayer
						moment={plusOffer.moment}
						onDismiss={() => setDeclined(true)}
						onOpen={() => openPaywall("mirror_landed")}
						sessionId={plusOffer.sessionId}
						variant={plusOffer.variant}
					/>
				</Animated.View>
			) : null}

			{PATHS.map((p, i) => (
				<PathChoiceCard
					image={p.image}
					index={offering ? i + 1 : i}
					key={p.key}
					last={i === PATHS.length - 1}
					onPress={() => void select[p.key]()}
					sub={p.sub}
					tint={p.tint}
					title={p.title}
				/>
			))}
			<View className="bg-surface">
				<View className={LAST_TINT} style={{ height: insets.bottom + 40 }} />
			</View>
		</ScrollView>
	);
};
