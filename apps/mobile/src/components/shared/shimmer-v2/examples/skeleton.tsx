import React, { type FC } from "react";
import { View } from "react-native";
import { Easing } from "react-native-reanimated";
import Shimmer from "../index";

export const Skeleton: FC = () => (
	<Shimmer className="w-4/5">
		<Shimmer.Mask
			background={<View className="flex-1 bg-neutral-600" />}
			overlay={
				<Shimmer.Overlay
					animation={{
						config: {
							duration: 2500,
							easing: Easing.bezier(0.2, 1.3, 0.8, -0.3),
						},
						type: "timing",
					}}
					trackAngle={30}
					width="100%"
				>
					<View
						className="flex-1"
						style={{
							experimental_backgroundImage:
								"linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent)",
						}}
					/>
				</Shimmer.Overlay>
			}
		>
			<View className="gap-4">
				{Array.from({ length: 3 }).map((_, index) => (
					<View className="flex-row items-center gap-3" key={index}>
						<View className="size-10 rounded-full bg-black" />
						<View className="flex-1 gap-2">
							<View className="h-3 w-full rounded-full bg-black" />
							<View className="h-3 w-3/4 rounded-full bg-black" />
						</View>
					</View>
				))}
			</View>
		</Shimmer.Mask>
	</Shimmer>
);
