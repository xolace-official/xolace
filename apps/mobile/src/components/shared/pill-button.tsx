import { Pressable } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playAffirmativePress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Props = {
	label: string;
	onPress: () => void;
	className?: string;
	disabled?: boolean;
};

export const PillButton = ({ label, onPress, className, disabled }: Props) => {
	const handlePress = () => {
		playAffirmativePress();
		onPress();
	};

	return (
		<Pressable
			className={cn(
				"self-center rounded-full bg-accent/10 px-8 py-3",
				disabled && "opacity-40",
				className
			)}
			disabled={disabled}
			onPress={handlePress}
		>
			<AppText className="text-center font-semibold text-accent text-base">
				{label}
			</AppText>
		</Pressable>
	);
};
