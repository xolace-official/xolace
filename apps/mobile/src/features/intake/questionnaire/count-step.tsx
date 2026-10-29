// The last screen before the offer: one real number from `intake.campfireStats`, never
// an outcome promise; a thin sample drops the second line. Only the numbers wait on
// the network, never the Continue button (#277): intake has no back edge.

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
			{/* Both blocks gated together so the copy arrives as one beat. */}
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
