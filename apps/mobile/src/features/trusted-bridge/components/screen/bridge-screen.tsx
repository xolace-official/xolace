import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useNavigation, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
	Button,
	Description,
	Input,
	PressableFeedback,
	TextArea,
	TextField,
	useThemeColor,
	useToast,
} from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import type { TextInputInstance } from "react-native";
import { Pressable, Share, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import {
	KeyboardAwareScrollView,
	KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BridgeDoneButton } from "@/features/trusted-bridge/components/bridge-done-button";
import { BridgeIntro } from "@/features/trusted-bridge/components/bridge-intro";
import { BridgeQuotaHint } from "@/features/trusted-bridge/components/bridge-quota-hint";
import { ShimmerLoadingText } from "@/features/trusted-bridge/components/shimmer-loading-text";
import { useBridgeDraft } from "@/features/trusted-bridge/hooks/use-bridge-draft";
import { useAppStore } from "@/store/store";

type Step = "recipient" | "draft";
type Relationship = "parent" | "partner" | "friend" | "sibling";

const RELATIONSHIPS: Relationship[] = [
	"parent",
	"partner",
	"friend",
	"sibling",
];

// Address-term suggestions only where what you call them diverges from their
// name. For a friend or sibling you usually just use the name, so we skip chips.
const ADDRESS_TERMS: Record<Relationship, string[]> = {
	friend: [],
	parent: ["Mom", "Mum", "Mama", "Dad", "Ma"],
	partner: ["babe", "love", "honey"],
	sibling: ["bro", "sis", "bruh"],
};
// Mirrors the caps enforced in convex/ai/bridge.ts — the server trims to these,
// so the field stops the user at the boundary rather than silently losing text.
// The counter stays hidden until they're close, so a quiet screen stays quiet.
const MAX_NAME_LENGTH = 60;
const MAX_ADDRESS_TERM_LENGTH = 40;
const COUNTER_REVEAL_THRESHOLD = 10;

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_IN = {
	delay: 80,
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };

type Props = {
	sessionId: Id<"sessions">;
	stepId?: Id<"path_steps">;
};

export function BridgeScreen({ sessionId, stepId }: Props) {
	const router = useRouter();
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();
	const posthog = usePostHog();
	const completeStep = useMutation(api.paths.completeStep);
	const { toast } = useToast();
	const mutedColor = (useThemeColor("foreground") as string) + "55";

	const bridgeIntroSeen = useAppStore((s) => s.bridgeIntroSeen);
	const setBridgeIntroSeen = useAppStore((s) => s.setBridgeIntroSeen);

	const [showIntro, setShowIntro] = useState(!bridgeIntroSeen);
	const [step, setStep] = useState<Step>("recipient");
	const [name, setName] = useState("");
	const [relationship, setRelationship] = useState<Relationship | null>(null);
	const [addressTerm, setAddressTerm] = useState<string | null>(null);
	const [hasShared, setHasShared] = useState(false);
	const { status, draft, setDraft, generate } = useBridgeDraft();
	const addressInputRef = useRef<TextInputInstance>(null);

	const nameRemaining = MAX_NAME_LENGTH - name.length;
	const addressRemaining = MAX_ADDRESS_TERM_LENGTH - (addressTerm?.length ?? 0);

	const selectRelationship = (rel: Relationship) => {
		setRelationship((prev) => (prev === rel ? null : rel));
		setAddressTerm(null); // terms differ per relationship — reset on change
	};

	// When a relationship is chosen, focus the address field so the newly revealed
	// section scrolls above the keyboard — otherwise it appears hidden underneath it.
	useEffect(() => {
		if (relationship) {
			const t = setTimeout(() => addressInputRef.current?.focus(), 50);
			return () => clearTimeout(t);
		}
	}, [relationship]);

	useEffect(() => {
		navigation.setOptions({ gestureEnabled: step === "recipient" });
	}, [navigation, step]);

	const handleBegin = () => {
		setBridgeIntroSeen(true);
		setShowIntro(false);
	};

	const handleDismiss = () => {
		posthog.capture("bridge_dismissed", { step: "recipient" });
		router.replace("/");
	};

	const handleWriteTogether = () => {
		if (!name.trim()) {
			return;
		}
		posthog.capture("bridge_opened", { recipient_relationship: relationship });
		setHasShared(false); // fresh draft — not yet shared
		setStep("draft");
		generate(
			sessionId,
			name.trim(),
			relationship ?? undefined,
			addressTerm ?? undefined
		);
	};

	const handleShare = async () => {
		if (!draft.trim()) {
			return;
		}
		try {
			const result = await Share.share({ message: draft });
			// Only treat it as shared when the sheet actually completed — this is what
			// reveals the "Done" affordance. (Android always reports sharedAction.)
			if (result.action === Share.sharedAction) {
				posthog.capture("bridge_shared", {
					recipient_relationship: relationship,
				});
				if (stepId) {
					try {
						await completeStep({ stepId });
					} catch {
						toast.show({
							label: "Couldn't save your progress. Try sharing again.",
							variant: "default",
						});
						return;
					}
				}
				setHasShared(true);
			}
		} catch {
			// share sheet cancelled
		}
	};

	const handleComplete = () => {
		posthog.capture("bridge_completed", {
			recipient_relationship: relationship,
		});
		router.replace("/");
	};

	if (showIntro) {
		return (
			<View
				className="flex-1 bg-background"
				style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
			>
				<BridgeIntro onBegin={handleBegin} />
			</View>
		);
	}

	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
		>
			{/* ── Recipient step ── */}
			{step === "recipient" && (
				<View className="flex-1">
					<KeyboardAwareScrollView
						bottomOffset={110}
						className="flex-1"
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<EaseView
							animate={FADE_IN}
							initialAnimate={FADE_OUT}
							transition={EASE_IN}
						>
							<View className="flex-row items-center px-5 pt-4 pb-2">
								<Pressable
									accessibilityLabel="Close"
									accessibilityRole="button"
									hitSlop={12}
									onPress={handleDismiss}
								>
									<SymbolView
										name={{ android: "close", ios: "xmark", web: "close" }}
										size={18}
										tintColor={mutedColor}
									/>
								</Pressable>
							</View>

							<View className="gap-8 px-5 pt-6">
								{/* Heading */}
								<View className="gap-2">
									<AppText className="text-3xl text-foreground leading-10">
										Who would you like to tell?
									</AppText>
									<AppText className="font-light text-foreground/40 text-sm leading-5">
										We&apos;ll shape the message around them. We never store who
										they are.
									</AppText>
								</View>

								{/* Name field */}
								<TextField>
									<Input
										autoFocus
										maxLength={MAX_NAME_LENGTH}
										onChangeText={setName}
										placeholder="their name or how you think of them"
										value={name}
									/>
									{nameRemaining <= COUNTER_REVEAL_THRESHOLD && (
										<Description>{nameRemaining} characters left</Description>
									)}
								</TextField>

								{/* Relationship section */}
								<View className="gap-3">
									<View className="gap-0.5">
										<AppText className="font-medium text-foreground/70 text-sm">
											Their relationship to you
										</AppText>
										<AppText className="font-light text-foreground/35 text-xs leading-4">
											Optional - helps us find the right tone for your words
										</AppText>
									</View>
									<View className="flex-row flex-wrap gap-2">
										{RELATIONSHIPS.map((rel) => (
											<PressableFeedback
												accessibilityLabel={rel}
												accessibilityRole="button"
												accessibilityState={{ selected: relationship === rel }}
												className={`rounded-full border px-4 py-2 ${relationship === rel ? "border-accent/40 bg-accent/10" : "border-border/55 bg-surface/30"}`}
												key={rel}
												onPress={() => selectRelationship(rel)}
											>
												<AppText
													className={`text-sm ${relationship === rel ? "font-medium text-accent" : "font-light text-foreground/55"}`}
												>
													{rel}
												</AppText>
											</PressableFeedback>
										))}
									</View>
								</View>

								{/* Address-term section — chips suggest, field captures the long tail */}
								{relationship && (
									<View className="gap-3">
										<View className="gap-0.5">
											<AppText className="font-medium text-foreground/70 text-sm">
												What do you call them?
											</AppText>
											<AppText className="font-light text-foreground/35 text-xs leading-4">
												Optional - the message will open with exactly this word,
												the way you greet them (like &ldquo;Mom&rdquo;,
												&ldquo;babe&rdquo; or &ldquo;bro&rdquo;), instead of
												their name.
											</AppText>
										</View>
										{ADDRESS_TERMS[relationship].length > 0 && (
											<View className="flex-row flex-wrap gap-2">
												{ADDRESS_TERMS[relationship].map((term) => (
													<PressableFeedback
														accessibilityLabel={term}
														accessibilityRole="button"
														accessibilityState={{
															selected: addressTerm === term,
														}}
														className={`rounded-full border px-4 py-2 ${addressTerm === term ? "border-accent/40 bg-accent/10" : "border-border/55 bg-surface/30"}`}
														key={term}
														onPress={() =>
															setAddressTerm(addressTerm === term ? null : term)
														}
													>
														<AppText
															className={`text-sm ${addressTerm === term ? "font-medium text-accent" : "font-light text-foreground/55"}`}
														>
															{term}
														</AppText>
													</PressableFeedback>
												))}
											</View>
										)}
										<TextField>
											<Input
												maxLength={MAX_ADDRESS_TERM_LENGTH}
												onChangeText={(t) =>
													setAddressTerm(t.length > 0 ? t : null)
												}
												placeholder="or type what you call them"
												// heroui-native still types `ref` as the pre-0.87 TextInput class; the runtime value is the instance.
												ref={addressInputRef as never}
												value={addressTerm ?? ""}
											/>
											{addressRemaining <= COUNTER_REVEAL_THRESHOLD && (
												<Description>
													{addressRemaining} characters left
												</Description>
											)}
										</TextField>
									</View>
								)}
							</View>
						</EaseView>
					</KeyboardAwareScrollView>

					{/* Sticky CTA — rides above the keyboard, tucks into the safe area when closed */}
					<KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
						<View className="bg-background px-8 pt-2 pb-10">
							<Button
								className="w-full"
								isDisabled={!name.trim()}
								onPress={handleWriteTogether}
								size="lg"
								variant="primary"
							>
								Write this together
							</Button>
							<BridgeQuotaHint />
						</View>
					</KeyboardStickyView>
				</View>
			)}

			{/* ── Draft step ── */}
			{step === "draft" && (
				<View className="flex-1">
					{/* Nav */}
					<View className="flex-row items-center justify-between px-5 pt-4 pb-2">
						<Pressable
							accessibilityLabel="Back"
							accessibilityRole="button"
							hitSlop={12}
							onPress={() => {
								setHasShared(false);
								setStep("recipient");
							}}
						>
							<SymbolView
								name={{
									android: "arrow_back",
									ios: "chevron.left",
									web: "arrow_back",
								}}
								size={18}
								tintColor={mutedColor}
							/>
						</Pressable>
						{hasShared && <BridgeDoneButton onPress={handleComplete} />}
					</View>

					{status === "loading" ? (
						<View className="flex-1 justify-center">
							<ShimmerLoadingText name={name} />
						</View>
					) : (
						<EaseView
							animate={FADE_IN}
							className="flex-1"
							initialAnimate={FADE_OUT}
							transition={EASE_IN}
						>
							{/* Scrollable content — keyboard-aware so the editor lifts above the keyboard */}
							<KeyboardAwareScrollView
								bottomOffset={170}
								className="flex-1"
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<View className="gap-5 px-8 pt-4 pb-6">
									{/* Heading */}
									<View className="gap-2">
										<AppText className="text-3xl text-foreground leading-10">
											A message for {name}.
										</AppText>
										<AppText className="font-light text-foreground/40 text-sm leading-5">
											This was shaped around what you felt. Edit it until it
											sounds like you, then share when you&apos;re ready.
										</AppText>
									</View>

									{/* Error banner */}
									{(status === "error" || status === "rate_limited") && (
										<View className="flex-row items-start gap-3 rounded-2xl border border-border/40 bg-surface/40 px-4 py-3">
											<SymbolView
												name={{
													android:
														status === "rate_limited"
															? "schedule"
															: "error_outline",
													ios:
														status === "rate_limited"
															? "clock"
															: "exclamationmark.circle",
													web:
														status === "rate_limited"
															? "schedule"
															: "error_outline",
												}}
												size={15}
												tintColor={mutedColor}
											/>
											<AppText className="flex-1 font-light text-foreground/55 text-xs leading-4">
												{status === "rate_limited"
													? "That's every draft you have today. It comes back tomorrow, the template below is yours to edit in the meantime."
													: "Couldn't personalize this time, but the template below is yours to edit."}
											</AppText>
										</View>
									)}

									{/* Draft text area */}
									<TextArea
										className="min-h-44"
										numberOfLines={8}
										onChangeText={setDraft}
										value={draft}
									/>
								</View>
							</KeyboardAwareScrollView>

							{/* Bottom actions — ride above the keyboard while editing the draft */}
							<KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
								<View className="gap-3 bg-background px-8 pt-3 pb-10">
									<View className="flex-row items-center justify-center gap-1.5">
										<SymbolView
											name={{ android: "lock", ios: "lock.fill", web: "lock" }}
											size={11}
											tintColor={mutedColor}
										/>
										<AppText className="font-light text-foreground/30 text-xs">
											Used only to write your draft · never stored
										</AppText>
									</View>
									<Button
										className="w-full"
										onPress={handleShare}
										size="lg"
										variant="primary"
									>
										Share with {name}
									</Button>
									<Button
										className="w-full"
										onPress={() => {
											posthog.capture("bridge_dismissed", { step: "draft" });
											router.replace("/");
										}}
										size="md"
										variant="ghost"
									>
										Not right now
									</Button>
								</View>
							</KeyboardStickyView>
						</EaseView>
					)}
				</View>
			)}
		</View>
	);
}
