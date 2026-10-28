/**
 * The last screen before the offer: one big number, and it is a real one.
 *
 * `intake.campfireStats` returns the camper population from the
 * `reflectionRank` aggregate and, when enough sessions have been rated, the
 * share of them that ended "lighter". Both are counts of things that actually
 * happened — nothing here is an outcome promise, and the second line is
 * dropped entirely rather than filled in when the sample is too thin.
 *
 * Whatever the number is, that's the number. A small one early is honest; the
 * screen doesn't hide itself to flatter the count.
 *
 * The numbers are the only thing that waits on the network — never the button
 * (#277). This is the last screen before the offer, intake has no back edge,
 * and the eleven answers are not persisted, so a screen held on a pending or
 * offline `campfireStats` is a dead end that costs the whole questionnaire.
 * Missing numbers drop the same way `lighterPercent === null` already drops:
 * the line isn't shown. Nothing here may gate the frame or the Continue press.
 */

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { playSoftPress } from "@/lib/haptics";

export function CountStep({ onDone }: { onDone: () => void }) {
	const stats = useQuery(api.intake.campfireStats);

	return (
		<IntakeScreen>
			{/* Both blocks are gated together rather than separately so the copy
          arrives as one beat when the read lands, instead of a stray closing
          line sitting alone above an empty screen waiting for its number. */}
			<View className="flex-1 justify-center px-8">
				{stats === undefined ? null : (
					<>
						<Animated.View className="gap-3" entering={FadeIn.duration(320)}>
							<AppText className="text-center font-[Poppins-SemiBold] text-[64px] text-accent leading-17.5">
								{stats.campers.toLocaleString()}
							</AppText>
							<AppText className="text-center font-[Poppins-Medium] text-[20px] text-foreground leading-7">
								{stats.campers === 1 ? "person has" : "people have"} sat by this
								fire.
							</AppText>
						</Animated.View>

						<Animated.View
							className="mt-8 gap-3"
							entering={FadeInUp.duration(320).delay(220)}
						>
							{stats.lighterPercent === null ? null : (
								<AppText className="text-center font-[Poppins-Regular] text-[16px] text-foreground/65 leading-6">
									When they say how they feel afterwards, {stats.lighterPercent}
									% say lighter.
								</AppText>
							)}
							<AppText className="text-center font-[Poppins-Regular] text-[16px] text-foreground/65 leading-6">
								You&apos;re not the only one who couldn&apos;t name it.
							</AppText>
						</Animated.View>
					</>
				)}
			</View>

			<View className="px-6 pb-4">
				<Button
					onPress={() => {
						playSoftPress();
						onDone();
					}}
				>
					<Button.Label>Continue</Button.Label>
				</Button>
			</View>
		</IntakeScreen>
	);
}
