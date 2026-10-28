import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { PillButton } from "@/components/shared/pill-button";
import { useSessionEndHref } from "@/features/kindling/use-session-end-href";
import { ReflectionCard } from "@/features/peer-reflection/components/reflection-card";
import { usePathSession } from "@/features/sit-with-this/hooks/use-path-session";

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_EMPTY_TRANSITION = {
	delay: 400,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_HEADER_TRANSITION = {
	duration: 500,
	easing: EASING,
	type: "timing" as const,
};
const EASE_DONE_TRANSITION = {
	delay: 800,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};

export const PeerReflectionScreen = () => {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { toast } = useToast();
	const startedRef = useRef(false);

	const { sessionId, session, isLoading, startPath, completePath } =
		usePathSession();
	const posthog = usePostHog();
	const afterPath = useSessionEndHref(sessionId);
	// Once we complete + navigate to session-end, getActive goes null. Claim the
	// finish so the "no active session" guard below doesn't race us home.
	const finishingRef = useRef(false);

	useEffect(() => {
		Presets.murmur();
	}, []);

	// Start the path on mount
	useEffect(() => {
		if (startedRef.current || !sessionId || !session) {
			return;
		}
		if (session.state === "path_selected") {
			const go = async () => {
				const ok = await startPath();
				if (ok) {
					startedRef.current = true;
				}
			};
			go();
		} else if (session.state === "path_in_progress") {
			startedRef.current = true;
		}
	}, [sessionId, session, startPath]);

	// Guard: no active session (e.g. completed or abandoned externally). Skipped
	// once we're deliberately finishing — that null is our own completion.
	useEffect(() => {
		if (!(isLoading || sessionId || finishingRef.current)) {
			router.replace("/");
		}
	}, [isLoading, sessionId, router]);

	// Try matching reflections for this session
	const matchedReflections = useQuery(
		api.reflections.matchForSession,
		sessionId ? { sessionId } : "skip"
	);

	// Fallback: recent reflections when match returns empty
	const recentReflections = useQuery(
		api.reflections.listRecent,
		matchedReflections !== undefined && matchedReflections.length === 0
			? { limit: 4 }
			: "skip"
	);

	// True when matched returned empty and fallback is still loading
	const awaitingFallback =
		matchedReflections !== undefined &&
		matchedReflections.length === 0 &&
		recentReflections === undefined;

	const isFallback =
		matchedReflections !== undefined &&
		matchedReflections.length === 0 &&
		(recentReflections?.length ?? 0) > 0;

	const reflections = (
		matchedReflections && matchedReflections.length > 0
			? matchedReflections
			: (recentReflections ?? [])
	) as NonNullable<typeof matchedReflections>;

	// Batch check resonance state from server
	const reflectionIds = reflections.map((r) => r._id);
	const resonatedMap = useQuery(
		api.reflections.hasResonated,
		reflectionIds.length > 0 ? { reflectionIds } : "skip"
	);

	const toggleResonanceMutation = useMutation(api.reflections.toggleResonance);

	const handleDone = async () => {
		if (finishingRef.current) {
			return;
		}
		finishingRef.current = true;
		// Complete before navigating so the session is durably terminal even if the
		// user closes the app on session-end. `afterPath` carries the id — getActive
		// is null once completed — and routes via the kindling announcement if due.
		const href = afterPath("peers");
		await completePath(true);
		router.replace(href);
	};

	const safeAreaStyle = {
		paddingBottom: insets.bottom,
		paddingTop: insets.top,
	};

	if (isLoading || matchedReflections === undefined || awaitingFallback) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={safeAreaStyle}
			>
				<MorphLoader />
			</View>
		);
	}

	if (reflections.length === 0) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background px-8"
				style={safeAreaStyle}
			>
				<AppText className="text-center text-base text-foreground/40">
					No reflections yet. You&apos;re among the first.
				</AppText>
				<EaseView
					animate={EASE_ANIMATE_FADE}
					className="mt-8"
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_EMPTY_TRANSITION}
				>
					<PillButton label="Done" onPress={handleDone} />
				</EaseView>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background" style={safeAreaStyle}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<EaseView
					animate={EASE_ANIMATE_FADE}
					className="mb-4"
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_HEADER_TRANSITION}
				>
					<AppText className="text-foreground/55 text-lg leading-7">
						Others have felt{"\n"}something like this.
					</AppText>
					{isFallback && (
						<View className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3">
							<AppText className="font-medium text-warning/70 text-xs uppercase tracking-widest">
								No close match found
							</AppText>
							<AppText className="mt-1 text-foreground/55 text-sm leading-6">
								We couldn&apos;t find a close match for what you&apos;re feeling
								right now.
								{"\n"}These are recent reflections from others; yours could be
								the first of its kind here.
							</AppText>
						</View>
					)}
				</EaseView>

				{reflections.map((reflection, i) => (
					<ReflectionCard
						index={i}
						key={reflection._id}
						onRequestReport={() =>
							router.push({
								params: { reflectionId: reflection._id },
								pathname: "/report-reflection",
							})
						}
						onToggleResonance={async () => {
							try {
								const result = await toggleResonanceMutation({
									reflectionId: reflection._id,
								});
								if (result != null && !result.rateLimited) {
									posthog.capture("peer_resonance_toggled", {
										is_fallback: isFallback,
										reflection_index: i,
										resonated: result.resonated,
									});
								}
								if (result?.rateLimited) {
									toast.show({
										description: "Take a breath before resonating again.",
										label: "Slow down",
										variant: "default",
									});
								}
							} catch {
								toast.show({
									description: "Try again in a moment.",
									label: "Something went wrong",
									variant: "default",
								});
							}
						}}
						resonanceCount={reflection.resonanceCount}
						resonated={!!resonatedMap?.[reflection._id]}
						text={reflection.displayText}
					/>
				))}
			</ScrollView>

			<EaseView
				animate={EASE_ANIMATE_FADE}
				className="items-center gap-3 pt-1 pb-2"
				initialAnimate={EASE_INITIAL_FADE}
				transition={EASE_DONE_TRANSITION}
			>
				<PillButton label="Done" onPress={handleDone} />
				<AppText className="pb-2 text-center text-foreground/25 text-xs">
					Long press any card to report
				</AppText>
			</EaseView>
		</View>
	);
};

const styles = StyleSheet.create({
	scrollContent: { gap: 12, padding: 24, paddingBottom: 40 },
});
