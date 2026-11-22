import { View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { COPY } from "@/features/you/copy";
import { useYouHome } from "@/features/you/home/you-data";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

export function AvatarButton() {
	const { state, actions } = useYouHome();
	const foreground = useTokenColor("foreground");
	const ember = useTokenColor("ember");
	const avatar = state.avatar;
	return (
		<PressScale
			accessibilityLabel={COPY.avatar.button(avatar?.label)}
			accessibilityRole="button"
			className="size-23"
			disabled={!avatar}
			haptic={playSoftPress}
			onPress={actions.openAvatar}
		>
			<View className="absolute -top-[4.5px] -left-[4.5px] size-[101px] rounded-full border-[1.5px] border-ember/70" />
			{avatar ? (
				<Image
					className="size-23 rounded-full"
					contentFit="cover"
					recyclingKey={avatar.key}
					source={{ uri: avatar.url }}
					transition={150}
				/>
			) : (
				<View className="size-23 items-center justify-center rounded-full bg-ember-wash">
					<Icon
						color={ember}
						name={{ android: "local_fire_department", ios: "flame.fill" }}
						size={34}
					/>
				</View>
			)}
			<View className="absolute -right-px -bottom-px size-7 items-center justify-center rounded-full border-[0.5px] border-glass-edge bg-glass">
				<Icon
					color={foreground}
					name={{ android: "edit", ios: "pencil" }}
					size={12}
					weight="bold"
				/>
			</View>
		</PressScale>
	);
}
