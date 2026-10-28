import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { HeavierStep } from "@/features/follow-up/heavier-step";
import { ReflectiveStep } from "@/features/follow-up/reflective-step";
import {
	Icon,
	type IconKey,
	OptionCard,
} from "@/features/follow-up/stack-cards";
import { StillHereStep } from "@/features/follow-up/still-here-step";
import { removeEmDash } from "@/features/quotes/utils/text-utils";
import {
	chipsForTier,
	FOLLOW_UP_FALLBACK_HEADLINE,
	FOLLOW_UP_MASCOT_LABEL,
	FOLLOW_UP_RESOURCES_LABEL,
	type FollowUpResponse,
	type FollowUpTier,
	STEP_HEADLINE,
	type StatusResponse,
	VENT_A11Y_LABEL,
	VENT_LABEL,
	VENT_SUBLABEL,
} from "@/features/reflect/follow-up-copy";
import { useFullContext } from "@/lib/convex/use-full-context";
import { playFollowUpEntrance } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Dev/preview storage buckets differ from prod (Convex deploys are per-env).
const FLUX = {
	uri: __DEV__
		? "https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/433565d2-012f-4938-b99a-7a3b77ebd8a1"
		: "https://energetic-guineapig-283.convex.cloud/api/storage/1dbf90a4-aa6b-41fe-b16c-49677fa82bd5",
};
const FLUX_SMALL = require("@/assets/images/flux/flux-point-down-removebg-preview.png");

const STATUS_LOOK: Record<StatusResponse, { icon: IconKey; tint: string }> = {
	heavier: { icon: "rain", tint: "bg-accent/20" },
	lighter: { icon: "sun", tint: "bg-success/20" },
	processed: { icon: "seal", tint: "bg-ember/25" },
	still_here: { icon: "cloud", tint: "bg-frost/20" },
};

export type FollowUpParams = {
	cardId: Id<"follow_up_cards">;
	/** Absent on restored or deep-linked routes — falls back to generic copy. */
	cardText?: string;
	tier: FollowUpTier;
	/** "1" when the card came out of an escalation — shows the resources link. */
	escalation?: string;
};

/**
 * The full-screen follow-up check-in (#448). Picker → per-answer next step.
 * `lighter` and `processed` share the reflective step (#449, #450), `still_here`
 * and `heavier` get their own (#451, #452).
 */
export function FollowUpScreen() {
	const { cardId, cardText, tier, escalation } =
		useLocalSearchParams<FollowUpParams>();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const posthog = usePostHog();
	const resolveCard = useMutation(api.followUps.resolveCard);
	const streak = useFullContext()?.streak ?? 0;
	const [picked, setPicked] = useState<StatusResponse | null>(null);
	const answered = useRef(false);
	const escalationDerived = escalation === "1";

	// One cue per open, same for every tier — the screen is the single trigger.
	useEffect(() => playFollowUpEntrance(), []);

	// Leaving before an answer — close, Android back, anything that unmounts the
	// route — is today's no-guilt dismiss. An answer, once given, stands.
	useEffect(
		() => () => {
			if (answered.current) {
				return;
			}
			void resolveCard({ cardId, response: "dismissed" });
			posthog.capture("follow_up_dismissed", {
				escalation_derived: escalationDerived,
				tier,
			});
		},
		[cardId, tier, escalationDerived, resolveCard, posthog]
	);

	// Returns false on a second tap (double tap, chip-then-vent) so it can't navigate or log twice.
	const answer = (response: FollowUpResponse) => {
		if (answered.current) {
			return false;
		}
		answered.current = true;
		void resolveCard({ cardId, response });
		posthog.capture("follow_up_responded", {
			escalation_derived: escalationDerived,
			response,
			tier,
		});
		return true;
	};

	const close = () => router.back();

	return (
		<KeyboardAvoidingView
			behavior="padding"
			className="flex-1 bg-surface-secondary"
		>
			<View
				className="flex-1 overflow-hidden"
				style={{ paddingTop: insets.top + 8 }}
			>
				<View className="flex-row items-center justify-between px-5">
					<View>
						<AppText className="font-medium text-foreground text-lg">
							Checking back in
						</AppText>
						<View className="mt-1 h-1.5 w-24 rounded-full bg-foreground/10">
							<View
								className={cn(
									"h-1.5 rounded-full bg-accent",
									picked ? "w-full" : "w-1/2"
								)}
							/>
						</View>
					</View>
					<View className="flex-row gap-2">
						{streak > 0 && (
							<View
								accessibilityLabel={`${streak}-day streak`}
								className="h-10 flex-row items-center gap-1.5 rounded-full bg-foreground/10 px-3.5"
							>
								<Icon name="flame" size={16} />
								<AppText className="text-foreground">{streak}</AppText>
							</View>
						)}
						<PressableFeedback
							accessibilityLabel="Close check-in"
							accessibilityRole="button"
							className="size-10 items-center justify-center rounded-full bg-foreground/10"
							hitSlop={8}
							onPress={close}
						>
							<Icon name="close" size={14} />
						</PressableFeedback>
					</View>
				</View>
				<Image
					accessibilityLabel={FOLLOW_UP_MASCOT_LABEL}
					contentFit="contain"
					source={picked ? FLUX_SMALL : FLUX}
					style={picked ? styles.heroSmall : styles.hero}
				/>
				<AppText className="px-6 pb-12 font-serif text-foreground text-xl leading-8">
					{picked
						? removeEmDash(STEP_HEADLINE[picked])
						: removeEmDash(cardText || FOLLOW_UP_FALLBACK_HEADLINE)}
				</AppText>
			</View>

			<ScrollView
				bounces={false}
				className="-mt-8 grow-0"
				keyboardShouldPersistTaps="handled"
				style={styles.stack}
			>
				{picked === "lighter" || picked === "processed" ? (
					<ReflectiveStep
						answer={picked}
						canShare={tier !== "acute" && !escalationDerived}
						cardId={cardId}
						onClose={close}
						streak={streak}
					/>
				) : picked === "still_here" ? (
					<StillHereStep onClose={close} />
				) : picked === "heavier" ? (
					<HeavierStep cardId={cardId} onClose={close} />
				) : (
					<>
						{chipsForTier(tier).map(({ key, label }) => (
							<OptionCard
								icon={STATUS_LOOK[key].icon}
								key={key}
								onPress={() => {
									if (answer(key)) {
										setPicked(key);
									}
								}}
								tint={STATUS_LOOK[key].tint}
								title={label}
							/>
						))}
						<OptionCard
							a11yLabel={VENT_A11Y_LABEL}
							icon="mic"
							onPress={() => {
								if (answer("vent")) {
									router.replace("/(protected)/voice-vent");
								}
							}}
							sub={VENT_SUBLABEL}
							tint="bg-surface"
							title={VENT_LABEL}
						/>
					</>
				)}
				<View
					className="items-center bg-surface pt-4"
					style={{ paddingBottom: insets.bottom + 16 }}
				>
					{!picked && (tier === "acute" || escalationDerived) && (
						<PressableFeedback
							accessibilityLabel={FOLLOW_UP_RESOURCES_LABEL}
							accessibilityRole="link"
							className="min-h-11 items-center justify-center"
							hitSlop={12}
							onPress={() => {
								posthog.capture("follow_up_resources_tapped", { tier });
								router.push("/crisis-resources");
							}}
						>
							<AppText className="text-sm text-warning/90 underline">
								{FOLLOW_UP_RESOURCES_LABEL}
							</AppText>
						</PressableFeedback>
					)}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	hero: { flex: 1, marginTop: 8 },
	heroSmall: { height: 100, marginLeft: 16, marginTop: 16, width: 120 },
	stack: { maxHeight: "68%" },
});
