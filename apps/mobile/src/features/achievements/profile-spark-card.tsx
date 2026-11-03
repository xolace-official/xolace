import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Link } from "expo-router";
import { Button, Spinner, Surface, useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import { useIsPlayful } from "@/lib/playful/use-playful";
import { Badge } from "./badge";
import { PinMark } from "./pin-mark";
import type { SparkShelf } from "./types";

const BADGE_SIZE = 56;

const LAPSED = "Your streak ended. Show up today, then buy one.";
const capped = (cap: number) => `You're holding the max of ${cap} freezes.`;

/** Why the buy button is off, or null when it's on. Mirrors buyFreeze's checks. */
function disabledReason(shelf: SparkShelf) {
	if (shelf.streakLapsed) {
		return LAPSED;
	}
	const short = shelf.freezePrice - shelf.balance;
	if (short > 0) {
		return `${short} more ${short === 1 ? "spark" : "sparks"} to buy one.`;
	}
	if (shelf.freezes >= shelf.freezeCap) {
		return capped(shelf.freezeCap);
	}
	return null;
}

/** What a refused buy tells the user: a race the card hadn't caught up with, or a failure. */
function refusalFor(error: unknown, shelf: SparkShelf) {
	const code =
		error instanceof ConvexError
			? (error.data as { code?: unknown } | undefined)?.code
			: undefined;
	switch (code) {
		case "freeze_cap_reached":
			return capped(shelf.freezeCap);
		case "insufficient_sparks":
			return "Not enough sparks for a freeze yet.";
		case "streak_lapsed":
			return LAPSED;
		default:
			return "Couldn't buy a freeze. Try again.";
	}
}

/**
 * The profile's spark card (#698), under the stat band: balance, a freeze to
 * buy, and three badges, pins first (#699).
 */
export function ProfileSparkCard() {
	const shelf = useQuery(api.achievements.display.shelf);
	const isPlayful = useIsPlayful();
	if (!shelf) {
		return null;
	}
	const body = <CardBody shelf={shelf} />;
	return (
		<View className="mt-3 px-5">
			{isPlayful ? (
				// Playful trades the glass for a solid Surface, like the stat band.
				<Surface className="p-5">{body}</Surface>
			) : (
				<GlassSurface className="p-5" radius={24}>
					{body}
				</GlassSurface>
			)}
		</View>
	);
}

function CardBody({ shelf }: { shelf: SparkShelf }) {
	const { badgeCount, badges, balance, earned, freezePrice } = shelf;
	const buyFreeze = useMutation(api.achievements.sparks.buyFreeze);
	const accentForeground = useThemeColor("accent-foreground") as string;
	const [buying, setBuying] = useState(false);
	// Kept with the shelf it answered, so it clears once the card's data moves on.
	const [refused, setRefused] = useState<{
		message: string;
		shelf: SparkShelf;
	}>();
	const refusal = refused?.shelf === shelf ? refused.message : null;
	const reason = disabledReason(shelf);

	const handleBuy = async () => {
		setBuying(true);
		setRefused(undefined);
		try {
			await buyFreeze();
		} catch (error) {
			setRefused({ message: refusalFor(error, shelf), shelf });
		} finally {
			setBuying(false);
		}
	};

	return (
		<>
			<View className="flex-row items-start justify-between">
				<View>
					<AppText className="text-[11px] text-muted uppercase tracking-wide">
						Sparks
					</AppText>
					<AppText
						accessibilityLabel={`${balance} ${balance === 1 ? "spark" : "sparks"} to spend`}
						className="font-bold text-[34px] text-ember leading-10"
					>
						{balance}
					</AppText>
					<AppText className="text-[13px] text-muted">
						{earned} earned all time
					</AppText>
				</View>
				<Link asChild href="/achievements">
					<Pressable
						accessibilityHint="Opens your achievements"
						accessibilityRole="button"
						hitSlop={8}
					>
						<AppText className="font-semibold text-[13px] text-foreground/80">
							{badgeCount} {badgeCount === 1 ? "badge" : "badges"} ›
						</AppText>
					</Pressable>
				</Link>
			</View>

			{badges.length > 0 ? (
				<View className="mt-4 flex-row gap-3">
					{badges.map((badge) => (
						<Link
							asChild
							href={{
								params: { achievementId: badge.achievementId },
								pathname: "/achievements/[achievementId]",
							}}
							key={badge.achievementId}
						>
							<Pressable
								accessibilityHint="Opens the badge"
								accessibilityLabel={
									badge.pinned ? `${badge.title}, pinned` : badge.title
								}
								accessibilityRole="button"
								className="relative"
							>
								<Badge achievement={badge} size={BADGE_SIZE} />
								{badge.pinned ? <PinMark /> : null}
							</Pressable>
						</Link>
					))}
				</View>
			) : null}

			<View className="mt-4 border-separator/50 border-t pt-4">
				<Button
					accessibilityHint={reason ?? undefined}
					isDisabled={reason !== null || buying}
					onPress={handleBuy}
					size="sm"
					variant="primary"
				>
					{buying ? (
						<Spinner color={accentForeground} />
					) : (
						<Button.Label>Buy a freeze · {freezePrice}</Button.Label>
					)}
				</Button>
				{(refusal ?? reason) ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="mt-2 text-center text-[11.5px] text-muted/80"
					>
						{refusal ?? reason}
					</AppText>
				) : null}
			</View>
		</>
	);
}
