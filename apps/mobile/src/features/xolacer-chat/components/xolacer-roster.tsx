import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { PressableFeedback, Surface } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { ConversationList } from "@/features/xolacer-chat/components/chats-list";
import { PresenceDot } from "@/features/xolacer-chat/components/presence-dot";
import {
	NewXolacerChip,
	RatingStars,
} from "@/features/xolacer-chat/components/rating-stars";
import {
	SpecialtyChips,
	SpecialtyFilter,
} from "@/features/xolacer-chat/components/specialty-chips";
import { usePresenceSnapshot } from "@/features/xolacer-chat/components/use-presence-snapshot";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";
import { sortByPresence } from "@/features/xolacer-chat/presence-ordering";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

/**
 * The roster: every published, active xolacer. A capped xolacer stays
 * visible but dimmed ("Full right now") — vanishing from a six-person list
 * would read as a bug. "Talking" marks xolacers you already have an open
 * thread with.
 */
export function XolacerRoster({
	conversations,
	filter,
	onFilterChange,
	stepId,
}: {
	conversations: ConversationList;
	/** Owned by the Connect screen so a routed specialty can preset it. */
	filter: string | null;
	onFilterChange: (slug: string | null) => void;
	/** Kindling twig that sent us — forwarded to the profile. */
	stepId?: string;
}) {
	const router = useRouter();
	const directory = useQuery(api.xolacerChat.directory);
	const presentSnapshot = usePresenceSnapshot(directory);

	if (directory !== undefined && directory.length === 0) {
		return (
			<View className="min-h-95 items-center justify-center gap-2.5 px-8">
				<View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary">
					<AppText className="text-lg">🕯️</AppText>
				</View>
				<AppText className="font-semibold text-[15px] text-foreground">
					No one&apos;s here just yet
				</AppText>
				<AppText className="max-w-60 text-center text-[13px] text-muted leading-5">
					Xolacers are still settling in. They&apos;ll show up here as they
					arrive — check back soon.
				</AppText>
			</View>
		);
	}

	const openWith = new Set(
		conversations
			.filter(
				(c) => c.kind === "pair" && c.role === "user" && c.status === "open"
			)
			.map((c) => (c as { xolacerProfileId: string }).xolacerProfileId)
	);

	const xolacers = directory ?? [];
	const offered = [
		...new Set(xolacers.flatMap((xolacer) => xolacer.specialties)),
	];
	const visible = filter
		? xolacers.filter((xolacer) =>
				(xolacer.specialties as readonly string[]).includes(filter)
			)
		: xolacers;

	// Specialty first, presence only as the tie-break *within* it: the filter is
	// applied above, so this can never lift someone who doesn't relate to what
	// the seeker is carrying. Ranked on the snapshot, not on the live flag, so
	// rows hold their position — the badge below still reads live.
	const ranked = presentSnapshot
		? sortByPresence(
				visible.map((xolacer) => ({
					present: presentSnapshot.has(xolacer.xolacerProfileId),
					xolacer,
				}))
			).map((entry) => entry.xolacer)
		: visible;

	return (
		<View className="gap-2.5">
			{/* An active filter is always offered, even if nobody declares it right
          now — otherwise a routed specialty no xolacer has leaves an empty
          list with no way back to everyone. */}
			<SpecialtyFilter
				available={filter ? [...offered, filter] : offered}
				onSelect={onFilterChange}
				selected={filter}
			/>

			{ranked.map((xolacer) => {
				const talking = openWith.has(xolacer.xolacerProfileId);
				return (
					<PressableFeedback
						// The dot is the only carrier of presence, so it has to be said.
						accessibilityLabel={`View ${xolacer.displayName}'s profile${
							xolacer.present ? ", here now" : ""
						}`}
						accessibilityRole="button"
						key={xolacer.xolacerProfileId}
						onPress={() => {
							playSoftPress();
							router.push({
								params: {
									profileId: xolacer.xolacerProfileId,
									...(stepId ? { stepId } : {}),
								},
								pathname: "/xolacer/[profileId]",
							});
						}}
					>
						<Surface
							className="flex-row items-start gap-3 p-3.5"
							style={styles.borderCurve}
						>
							<View>
								<XolacerAvatar
									muted={xolacer.atCapacity}
									name={xolacer.displayName}
									photoUrl={xolacer.photoUrl}
								/>
								{/* Live, unlike the ordering: someone arriving lights up where
                    they already are rather than jumping the list. */}
								{xolacer.present && <PresenceDot />}
							</View>
							<View className="min-w-0 flex-1 gap-1">
								<View className="flex-row items-center gap-1.5">
									<AppText
										className={cn(
											"shrink font-semibold text-sm",
											xolacer.atCapacity ? "text-muted" : "text-foreground"
										)}
										numberOfLines={1}
									>
										{xolacer.displayName}
									</AppText>
									{talking && (
										<View className="shrink-0 rounded-full bg-success/15 px-2 py-0.5">
											<AppText className="font-semibold text-[10px] text-success uppercase tracking-wide">
												Talking
											</AppText>
										</View>
									)}
									{/* Scores share one right-hand column so the eye reads down
                      it instead of hunting; capacity outranks the score. */}
									<View className="ml-auto shrink-0 pl-2">
										{xolacer.atCapacity ? (
											<View className="rounded-full bg-surface-tertiary px-2 py-0.5">
												<AppText className="font-semibold text-[10px] text-muted uppercase tracking-wide">
													Full right now
												</AppText>
											</View>
										) : xolacer.rating === undefined ? (
											<NewXolacerChip />
										) : (
											<RatingStars
												rating={xolacer.rating}
												ratingCount={xolacer.ratingCount}
											/>
										)}
									</View>
								</View>
								<AppText
									className="text-muted text-xs leading-4"
									numberOfLines={2}
								>
									{xolacer.bio}
								</AppText>
								<SpecialtyChips
									className="mt-0.5"
									muted={xolacer.atCapacity}
									specialties={xolacer.specialties}
								/>
							</View>
						</Surface>
					</PressableFeedback>
				);
			})}

			{filter !== null && visible.length === 0 && (
				<AppText className="py-8 text-center text-[13px] text-muted leading-5">
					Nobody&apos;s listed that right now. Try another tag, or browse
					everyone.
				</AppText>
			)}
		</View>
	);
}
