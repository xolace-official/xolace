import { cn } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";

type Props = {
	label: string;
	isFirst?: boolean;
};

export const TimelineSectionHeader = ({ label, isFirst = false }: Props) => (
	<View className={cn("px-5 pb-3", isFirst ? "pt-2" : "pt-8")}>
		<AppText className="text-foreground/40 text-sm">{label}</AppText>
	</View>
);
