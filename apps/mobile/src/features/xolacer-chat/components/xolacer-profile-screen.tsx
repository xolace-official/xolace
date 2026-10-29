import EditIcon from "@expo/material-symbols/edit.xml";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import {
	isSpecialty,
	specialtyListensTo,
} from "@xolace/backend/convex/lib/specialties";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
	Button,
	PressableFeedback,
	Skeleton,
	Surface,
	useThemeColor,
} from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { TopBlur } from "@/components/shared/top-blur";
import { ExpandableAvatar } from "@/features/xolacer-chat/components/expandable-avatar";
import { Fact } from "@/features/xolacer-chat/components/fact-row";
import { PresenceDot } from "@/features/xolacer-chat/components/presence-dot";
import {
	NewXolacerChip,
	RatingStars,
} from "@/features/xolacer-chat/components/rating-stars";
import { SpecialtyChips } from "@/features/xolacer-chat/components/specialty-chips";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";
import { XolacerMenu } from "@/features/xolacer-chat/components/xolacer-menu";
import { XolacerPrimerSheet } from "@/features/xolacer-chat/components/xolacer-primer-sheet";
import { formatMonthYear } from "@/features/xolacer-chat/format-time";
import { useAskFlow } from "@/features/xolacer-chat/use-ask-flow";
import {
	declineCooldownActive,
	declineCooldownNote,
	hasSpoken,
	rateCtaState,
} from "@/features/xolacer-chat/utils";
import { playSoftPress } from "@/lib/haptics";

type Profile = NonNullable<
	FunctionReturnType<typeof api.xolacerChat.xolacerProfile>
>;

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
	rateMascot: { height: 56, width: 56 },
});

const FLUX_PAIR = require("@/assets/images/flux/flux-pair-listening.png");

/** Native back chevron — liquid glass on iOS 26, Material back arrow on Android. */
const HEADER_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerBackVisible: true,
	headerShadowVisible: false,
	headerShown: true,
	headerTitle: "",
	headerTransparent: true,
} as const;

const PERSON_ICON = {
	android: "person",
	ios: "person",
	web: "person",
} as const;
const LOCK_ICON = { android: "lock", ios: "lock", web: "lock" } as const;
const CHAT_ICON = {
	android: "forum",
	ios: "bubble.left.and.bubble.right",
	web: "forum",
} as const;
const MOON_ICON = { android: "bedtime", ios: "moon", web: "bedtime" } as const;
const CHEVRON_ICON = {
	android: "chevron_right",
	ios: "chevron.right",
	web: "chevron_right",
} as const;

export function XolacerProfileScreen({
	profileId,
	specialty,
	stepId,
}: {
	profileId: string;
	specialty?: string;
	/** Kindling twig that led here — tended once a request is sent. */
	stepId?: string;
}) {
	const profile = useQuery(api.xolacerChat.xolacerProfile, {
		xolacerProfileId: profileId as Id<"emotional_profiles">,
	});

	if (profile === undefined) {
		return <ProfileSkeleton />;
	}
	if (profile === null) {
		return <ProfileUnavailable />;
	}
	return (
		<ProfileBody profile={profile} specialty={specialty} stepId={stepId} />
	);
}

function ProfileBody({
	profile,
	specialty,
	stepId,
}: {
	profile: Profile;
	specialty?: string;
	stepId?: string;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const {
		primerMode,
		sending,
		openThread,
		handleAsk,
		handlePrimerConfirm,
		handlePrimerClose,
		openPrimerReference,
	} = useAskFlow({
		displayName: profile.displayName,
		stepId: stepId as Id<"path_steps"> | undefined,
		xolacerProfileId: profile.xolacerProfileId,
	});

	const { conversation } = profile;
	const hasThread = conversation !== null && conversation.status !== "closed";
	const coolingDown = declineCooldownActive(conversation?.retryAvailableAt);

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={HEADER_OPTIONS} />

			{/* Same header slot, mutually exclusive branches: a xolacer is never
          offered moderation actions against themselves, and a single action
          doesn't earn an overflow menu. */}
			{profile.isSelf && (
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						accessibilityLabel="Edit your profile"
						icon={process.env.EXPO_OS === "ios" ? "pencil" : EditIcon}
						onPress={() => {
							playSoftPress();
							router.push("/xolacer-edit");
						}}
					/>
				</Stack.Toolbar>
			)}

			{!profile.isSelf && (
				<XolacerMenu
					conversationId={conversation?.id}
					hasHistory={conversation ? hasSpoken(conversation) : false}
					name={profile.displayName}
					origin="profile"
					profileId={profile.xolacerProfileId}
					rateState={rateCtaState(profile)}
				/>
			)}

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pb-8 gap-7"
				contentContainerStyle={{ paddingTop: insets.top + 52 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="items-center gap-3">
					<View>
						<ExpandableAvatar
							name={profile.displayName}
							photoUrl={profile.photoUrl}
						>
							<XolacerAvatar
								muted={!profile.available}
								name={profile.displayName}
								photoUrl={profile.photoUrl}
								size="lg"
							/>
						</ExpandableAvatar>
						{profile.present && <PresenceDot large />}
					</View>
					<View className="items-center gap-1.5">
						<AppText
							// The dot carries presence visually and announces nothing, so the
							// name is where a screen reader has to hear it.
							accessibilityLabel={
								profile.present
									? `${profile.displayName}, here now`
									: profile.displayName
							}
							className="font-semibold text-[26px] text-foreground leading-8"
						>
							{profile.displayName}
						</AppText>
						<ProfileRating profile={profile} />
						<AppText className="text-muted text-xs">
							Xolacer since {formatMonthYear(profile.xolacerSince)} ·{" "}
							{profile.present ? "here now" : "replies within a day"}
						</AppText>
					</View>
				</View>

				<View className="gap-4">
					<AppText className="px-2 text-center text-[17px] text-foreground leading-7">
						&ldquo;{profile.bio}&rdquo;
					</AppText>
					<SpecialtyChips
						className="justify-center"
						specialties={profile.specialties}
					/>
				</View>

				<View className="gap-3.5">
					{hasThread && (
						<Block accent title="You've talked before">
							<Fact icon={CHAT_ICON}>
								Your conversation is still here.{" "}
								{conversation.status === "resting"
									? "Picking it back up doesn't need a new request."
									: "Open it any time."}
							</Fact>
						</Block>
					)}

					{/* Suppressed under a cooldown: the CTA already names the reason, and
              "isn't taking new conversations" beside it reads as a second no. */}
					{!(profile.available || hasThread || coolingDown) && (
						<Block accent title="Not right now">
							<Fact icon={MOON_ICON}>
								{profile.displayName} isn&apos;t taking new conversations at the
								moment. Nothing to do with you — try someone else on the roster.
							</Fact>
						</Block>
					)}

					<Block onPress={openPrimerReference} title="What to expect">
						<Fact icon={PERSON_ICON}>
							{profile.displayName} is a trained peer Xolacer, not a therapist —
							no diagnoses, no clinical advice.
						</Fact>
						<Fact icon={LOCK_ICON}>
							Your chat is private between you two. It&apos;s never linked to
							your reflections.
						</Fact>
					</Block>
				</View>
			</ScrollView>
			<TopBlur height={insets.top + 70} />

			<View
				className="gap-3 border-border/40 border-t px-6 pt-4"
				style={{ paddingBottom: Math.max(insets.bottom, 20) }}
			>
				<RateCard
					onPress={() => {
						playSoftPress();
						if (conversation) {
							router.push({
								params: { conversationId: conversation.id },
								pathname: "/rate/[conversationId]",
							});
						}
					}}
					profile={profile}
				/>
				<ProfileCta
					onAsk={handleAsk}
					onOpen={() => {
						playSoftPress();
						if (conversation) {
							openThread(conversation.id);
						}
					}}
					profile={profile}
				/>
				{isSpecialty(specialty) && (
					<OtherListeners
						onPress={() => {
							playSoftPress();
							router.push({ params: { specialty }, pathname: "/connect" });
						}}
						specialty={specialty}
					/>
				)}
			</View>

			<XolacerPrimerSheet
				isConfirming={sending}
				isOpen={primerMode !== null}
				onClose={handlePrimerClose}
				onConfirm={primerMode === "gate" ? handlePrimerConfirm : undefined}
			/>
		</View>
	);
}

/** Always shows the denominator next to the score; under the display threshold says why instead
 * of empty stars. */
function ProfileRating({ profile }: { profile: Profile }) {
	if (profile.rating === undefined) {
		return (
			<View className="items-center gap-1">
				<NewXolacerChip />
				<AppText className="text-[11px] text-muted">
					Not enough conversations rated yet
				</AppText>
			</View>
		);
	}

	return (
		<View className="items-center gap-1">
			<RatingStars rating={profile.rating} ratingCount={profile.ratingCount} />
			<AppText className="text-[11px] text-muted">
				{profile.ratingCount} conversation{profile.ratingCount === 1 ? "" : "s"}{" "}
				rated
			</AppText>
		</View>
	);
}

/** The primary place a xolacer gets rated; collapses to a quiet line once the seeker has scored. */
function RateCard({
	profile,
	onPress,
}: {
	profile: Profile;
	onPress: () => void;
}) {
	const accent = useThemeColor("accent") as string;
	const state = rateCtaState(profile);
	if (state === "hidden") {
		return null;
	}

	if (state === "rated") {
		return (
			<PressableFeedback
				accessibilityLabel={`You rated ${profile.myRating} out of 5. Change your rating.`}
				accessibilityRole="button"
				hitSlop={8}
				onPress={onPress}
			>
				<AppText className="text-center text-muted text-xs">
					You rated ★{profile.myRating} —{" "}
					<AppText className="text-accent">change</AppText>
				</AppText>
			</PressableFeedback>
		);
	}

	return (
		<PressableFeedback
			accessibilityLabel={`Rate your conversation with ${profile.displayName}`}
			accessibilityRole="button"
			onPress={onPress}
		>
			<Surface
				className="flex-row items-center gap-3 p-3"
				style={styles.borderCurve}
			>
				<View
					className="h-14 w-14 overflow-hidden rounded-2xl bg-accent/10"
					style={styles.borderCurve}
				>
					<Image
						contentFit="cover"
						source={FLUX_PAIR}
						style={styles.rateMascot}
					/>
				</View>
				<View className="flex-1 gap-1">
					<AppText className="font-semibold text-[15px] text-foreground leading-5">
						How was talking with {profile.displayName}?
					</AppText>
					<View className="flex-row items-end justify-between gap-3">
						<AppText className="flex-1 text-[11px] text-muted leading-4">
							Only you and Xolace see your score.
						</AppText>
						<View className="flex-row items-center gap-1">
							<AppText className="font-semibold text-[13px] text-accent">
								Rate
							</AppText>
							<SymbolView name={CHEVRON_ICON} size={11} tintColor={accent} />
						</View>
					</View>
				</View>
			</Surface>
		</PressableFeedback>
	);
}

/** Names the request/accept reality, driven straight off the conversation row's existence and
 * status. */
function ProfileCta({
	profile,
	onAsk,
	onOpen,
}: {
	profile: Profile;
	onAsk: () => void;
	onOpen: () => void;
}) {
	const { conversation, available, displayName, isSelf } = profile;
	const retryAt = conversation?.retryAvailableAt;

	if (isSelf) {
		return <Note>This is how your profile looks to everyone else.</Note>;
	}

	if (conversation && conversation.status !== "closed") {
		return (
			<>
				<Button onPress={onOpen}>
					{conversation.status === "requested"
						? "See your request"
						: "Open chat"}
				</Button>
				{conversation.status === "requested" && (
					<Note>
						{displayName} has your request and can accept when they&apos;re
						ready.
					</Note>
				)}
			</>
		);
	}

	// Before the availability branch: "not taking conversations" would be untrue
	// about someone who declined. Compared, not merely present: a cached past
	// timestamp would disable the button and nothing would ever refresh the cache.
	if (declineCooldownActive(retryAt)) {
		return (
			<>
				<Button isDisabled variant="secondary">
					Not right now
				</Button>
				<Note>{declineCooldownNote(displayName, retryAt)}</Note>
			</>
		);
	}

	if (!available) {
		return (
			<>
				<Button isDisabled variant="secondary">
					Not taking conversations
				</Button>
				<Note>
					They&apos;ll show up as available again when they have space.
				</Note>
			</>
		);
	}

	return (
		<>
			<Button onPress={onAsk}>Ask to talk</Button>
			<Note>
				They&apos;ll get a request and can accept when they&apos;re ready.
			</Note>
		</>
	);
}

/** The roster narrowed to the same specialty; shown only when the route carried one. */
function OtherListeners({
	specialty,
	onPress,
}: {
	specialty: string;
	onPress: () => void;
}) {
	const accent = useThemeColor("accent") as string;

	return (
		<PressableFeedback
			accessibilityLabel={`See other Xolacers who listen to ${specialtyListensTo(specialty)}`}
			accessibilityRole="button"
			hitSlop={8}
			onPress={onPress}
		>
			<View className="flex-row items-center justify-center gap-1.5 py-2">
				<AppText className="font-medium text-[13px] text-accent">
					Others listen to {specialtyListensTo(specialty)} too
				</AppText>
				<SymbolView
					name={{
						android: "arrow_forward",
						ios: "arrow.right",
						web: "arrow_forward",
					}}
					size={12}
					tintColor={accent}
				/>
			</View>
		</PressableFeedback>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<AppText className="text-center text-muted text-xs leading-5">
			{children}
		</AppText>
	);
}

function Block({
	title,
	accent = false,
	onPress,
	children,
}: {
	title: string;
	accent?: boolean;
	onPress?: () => void;
	children: React.ReactNode;
}) {
	const muted = useThemeColor("muted") as string;

	return (
		<Surface
			className={accent ? "border-accent/25 bg-accent/8 p-5" : "p-5"}
			style={styles.borderCurve}
		>
			{onPress ? (
				<PressableFeedback
					accessibilityLabel={`${title} — read the full note`}
					accessibilityRole="button"
					hitSlop={8}
					onPress={onPress}
				>
					<View className="mb-3.5 flex-row items-center gap-1.5">
						<AppText className="font-bold text-[10px] text-muted uppercase tracking-widest">
							{title}
						</AppText>
						<SymbolView name={CHEVRON_ICON} size={9} tintColor={muted} />
					</View>
				</PressableFeedback>
			) : (
				<AppText className="mb-3.5 font-bold text-[10px] text-muted uppercase tracking-widest">
					{title}
				</AppText>
			)}
			<View className="gap-3.5">{children}</View>
		</Surface>
	);
}

function ProfileSkeleton() {
	return (
		<View className="flex-1 items-center gap-4 bg-background px-6 pt-28">
			<Stack.Screen options={HEADER_OPTIONS} />
			<Skeleton className="h-19 w-19 rounded-full" />
			<Skeleton className="h-7 w-36 rounded-lg" />
			<Skeleton className="h-4 w-52 rounded-lg" />
			<Skeleton className="mt-3 h-28 w-full rounded-3xl" />
			<Skeleton className="h-28 w-full rounded-3xl" />
		</View>
	);
}

function ProfileUnavailable() {
	return (
		<View className="flex-1 items-center justify-center gap-2 bg-background px-10">
			<Stack.Screen options={HEADER_OPTIONS} />
			<AppText className="font-semibold text-[15px] text-foreground">
				This Xolacer isn&apos;t here
			</AppText>
			<AppText className="text-center text-[13px] text-muted leading-5">
				Their profile may have been unpublished. There are others on the roster.
			</AppText>
		</View>
	);
}
