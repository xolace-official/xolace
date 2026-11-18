import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { Icon } from "@/components/shared/icon";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";

const LIFEBUOY = 20;
const CHEVRON = 14;

/** After 10pm, under something for the quiet: people you can reach, any time. */
export function LateCare() {
	const [danger, subtle] = useTokenColors(["danger", "subtle"]);
	const { actions } = useToday();
	return (
		<Card
			className="mt-3"
			label={`${COPY.lateCare.title}. ${COPY.lateCare.sub}`}
			onPress={actions.openHelp}
		>
			<View className="flex-row items-center gap-3.5 px-4 py-3.5">
				<View className="size-10 items-center justify-center rounded-full bg-danger-wash">
					<Icon
						color={danger}
						name={{ android: "support", ios: "lifepreserver" }}
						size={LIFEBUOY}
					/>
				</View>
				<View className="flex-1 gap-0.5">
					<AppText variant="subhead" weight="semibold">
						{COPY.lateCare.title}
					</AppText>
					<AppText color="muted" variant="detail">
						{COPY.lateCare.sub}
					</AppText>
				</View>
				<Icon
					color={subtle}
					name={{ android: "chevron_right", ios: "chevron.right" }}
					size={CHEVRON}
					weight="semibold"
				/>
			</View>
		</Card>
	);
}
