import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { PLUS } from "../copy";
import { usePlusScreen } from "../plus-data";

/** Everything Plus adds, the one the reader came for first and lit (production's rows). */
export function PlusIncludes() {
	const { state } = usePlusScreen();
	const muted = useTokenColor("muted");
	const ember = useTokenColor("ember");
	return (
		<View className="gap-1">
			<AppText
				accessibilityRole="header"
				className="mb-1 px-1"
				color="muted"
				variant="overline"
			>
				{PLUS.includes}
			</AppText>
			{state.features.map((f) => (
				<View
					accessible
					className={cn(
						"flex-row gap-3 rounded-[18px] px-3 py-2.5",
						f.highlighted && "border border-ember/30 bg-ember/10"
					)}
					key={f.id}
				>
					<View className="pt-0.5">
						<Icon
							color={f.highlighted ? ember : muted}
							name={f.icon}
							size={18}
						/>
					</View>
					<View className="flex-1 gap-0.5">
						<AppText variant="subhead" weight="semibold">
							{f.title}
						</AppText>
						<AppText color="muted" variant="footnote">
							{f.description}
						</AppText>
					</View>
				</View>
			))}
		</View>
	);
}
