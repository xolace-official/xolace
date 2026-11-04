// `safety` (#708): the safeguard read the answer as elevated or crisis. Support instead of
// chips, and nothing sold on the way on (no Xolace+). Flux stays out of it: this moment
// isn't a mascot's.
import { Button } from "heroui-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ResourceItem } from "@/components/shared/resource-item";
import type { SafetyResource } from "@/features/intake/v2/heard";

type Props = {
	onContinue: () => void;
	resources: readonly SafetyResource[];
};

export function SafetyStep({ onContinue, resources }: Props) {
	return (
		<View className="flex-1">
			<ScrollView
				contentContainerClassName="px-6 pt-8 pb-6"
				showsVerticalScrollIndicator={false}
			>
				<AppText
					accessibilityRole="header"
					className="font-[Poppins-SemiBold] text-[24px] text-foreground leading-[30px]"
				>
					That sounds like a lot to be carrying.
				</AppText>
				<AppText className="mt-3 font-[Poppins-Regular] text-[16px] text-foreground/80 leading-6">
					You don&apos;t have to hold it alone. If you&apos;re not safe right
					now, please reach out to one of these. They&apos;re here any time.
				</AppText>
				<View className="mt-6 gap-2">
					{[...resources]
						.sort((a, b) => a.priority - b.priority)
						.map((resource, index) => (
							<ResourceItem
								index={index}
								key={`${resource.type}-${resource.value}`}
								resource={resource}
							/>
						))}
				</View>
			</ScrollView>

			<View className="px-6 pt-2 pb-2">
				<Button onPress={onContinue} variant="secondary">
					<Button.Label>Continue to Xolace</Button.Label>
				</Button>
			</View>
		</View>
	);
}
