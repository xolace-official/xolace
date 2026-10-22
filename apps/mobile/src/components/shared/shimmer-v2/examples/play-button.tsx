import React, { type FC } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import Shimmer from "../index";

type Props = {
	debug?: boolean;
};

export const PlayButton: FC<Props> = ({ debug = false }) => {
	const shimmerProgress = useSharedValue(0);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${shimmerProgress.get() * 360}deg` }],
	}));

	return (
		<Pressable>
			<View style={{ backgroundColor: "#4f46e5", padding: 3 }}>
				<View style={{ backgroundColor: "#1e1b4b", padding: 2 }}>
					<Shimmer
						className="px-14 py-5"
						debug={debug}
						style={{ backgroundColor: "#0a0a1f" }}
					>
						<Shimmer.Overlay
							animation={{
								config: { duration: 2800 },
								reverse: true,
								type: "timing",
							}}
							initialDelay={0}
							onProgress={shimmerProgress}
							trackAngle={0}
							width={60}
						>
							<Animated.View
								className="h-full w-full items-center justify-around py-1"
								style={animatedStyle}
							>
								<View className="size-2 bg-cyan-400" />
								<View className="size-1.5 bg-cyan-400/40" />
								<View className="size-2 bg-cyan-300/70" />
							</Animated.View>
						</Shimmer.Overlay>

						<Shimmer.Overlay
							duration={3200}
							initialDelay={400}
							trackAngle={25}
							width={24}
						>
							<View className="flex-1 items-center justify-around py-2">
								<View className="size-1.5 bg-fuchsia-500/60" />
								<View className="size-2.5 bg-fuchsia-400" />
								<View className="size-1.5 bg-fuchsia-400/30" />
							</View>
						</Shimmer.Overlay>

						<Shimmer.Overlay
							duration={2400}
							initialDelay={800}
							trackAngle={340}
							width={20}
						>
							<View className="flex-1 items-center justify-around py-1">
								<View className="size-1.5 bg-lime-400/50" />
								<View className="size-2 bg-lime-300" />
								<View className="size-1.5 bg-lime-400/70" />
							</View>
						</Shimmer.Overlay>

						<Shimmer.Overlay
							duration={3600}
							initialDelay={200}
							trackAngle={65}
							width={22}
						>
							<View className="flex-1 items-center justify-around">
								<View className="size-2 bg-amber-400/40" />
								<View className="size-1.5 bg-amber-300/80" />
								<View className="size-2 bg-amber-400/60" />
							</View>
						</Shimmer.Overlay>

						<Text className="text-center font-bold text-2xl text-white tracking-widest">
							PLAY
						</Text>
					</Shimmer>
				</View>
			</View>
		</Pressable>
	);
};
