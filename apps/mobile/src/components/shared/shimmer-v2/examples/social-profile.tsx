import { LinearGradient } from "expo-linear-gradient";
import { cn } from "heroui-native";
import React, {
	createContext,
	type FC,
	type PropsWithChildren,
	type RefObject,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import type { ViewInstance } from "react-native";
import { Pressable, Text, View, type ViewProps } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeOut,
	useSharedValue,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import Shimmer from "../index";

const StyledLinearGradient = withUniwind(LinearGradient);

const entering = FadeIn.duration(200);
const exiting = FadeOut.duration(200);

// ------------------------------------------

type SkeletonContextValue = {
	isLoading: boolean;
};

const SkeletonContext = createContext<SkeletonContextValue>({
	isLoading: false,
});

const useSkeleton = (): SkeletonContextValue => useContext(SkeletonContext);

// ------------------------------------------

/**
 * View that always applies bg-black as a base mask color.
 * Inside Shimmer.Mask, opaque pixels define visible mask regions.
 * Outside Shimmer.Mask, bg-black acts as normal background.
 * Caller-supplied bg-* classes override via twMerge.
 */
const SkeletonItem = ({
	ref,
	children,
	className,
	style,
	...props
}: ViewProps & { ref?: RefObject<ViewInstance | null> }) => {
	const { isLoading } = useSkeleton();

	return (
		<View
			className={cn("rounded-xl", isLoading && "bg-black", className)}
			ref={ref}
			style={[{ borderCurve: "continuous" }, style]}
			{...props}
		>
			{children}
		</View>
	);
};

// ------------------------------------------

/**
 * Wraps children in Shimmer.Mask when loading, renders a bare fragment otherwise.
 * Only this component re-renders on isLoading change — SkeletonItem stays stateless.
 */
const SkeletonGroup: FC<PropsWithChildren> = ({ children }) => {
	const { isLoading } = useSkeleton();

	if (!isLoading) {
		return (
			<Animated.View entering={entering} exiting={exiting} key="content">
				{children}
			</Animated.View>
		);
	}

	return (
		<Animated.View entering={entering} exiting={exiting} key="skeleton">
			<Shimmer>
				<Shimmer.Mask
					background={<View className="flex-1 bg-neutral-800" />}
					overlay={
						<Shimmer.Overlay
							animation={{
								config: {
									duration: 1500,
									easing: Easing.bezier(0.2, 1.3, 0.8, -0.3),
								},
								type: "timing",
							}}
							width="100%"
						>
							<View
								className="flex-1"
								style={{
									experimental_backgroundImage:
										"linear-gradient(to right, transparent, rgba(255, 255, 255, 0.08), transparent)",
								}}
							/>
						</Shimmer.Overlay>
					}
				>
					{children}
				</Shimmer.Mask>
			</Shimmer>
		</Animated.View>
	);
};

// ------------------------------------------

/** Social media profile card demonstrating the SkeletonItem + SkeletonGroup skeleton pattern. */
export const SocialProfile: FC = () => {
	const [isLoading, setIsLoading] = useState(false);

	const avatarRef = useRef<ViewInstance>(null);
	const avatarLeft = useSharedValue(0);
	const avatarTop = useSharedValue(0);

	useEffect(() => {
		if (avatarRef.current) {
			avatarRef.current.measure((_x, _y, _width, _height, pageX, pageY) => {
				if (avatarLeft.get() === 0 && avatarTop.get() === 0) {
					avatarLeft.set(pageX);
					avatarTop.set(pageY);
				}
			});
		}
	}, [avatarRef, avatarLeft, avatarTop]);

	return (
		<>
			<SkeletonContext.Provider value={{ isLoading }}>
				<Pressable onPress={() => setIsLoading((previous) => !previous)}>
					<SkeletonGroup>
						<View>
							{/* Banner */}
							<SkeletonItem className="h-36">
								<StyledLinearGradient
									className="flex-1"
									colors={["#1e40af", "#7e22ce"]}
									end={{ x: 1, y: 0 }}
									start={{ x: 0, y: 1 }}
								/>
							</SkeletonItem>

							<View className="px-4 pb-5">
								{/* Avatar */}
								<SkeletonItem
									className="-mt-8 size-16 items-center justify-center rounded-full border-4 border-background bg-brand"
									ref={avatarRef}
								>
									<Text className="font-black font-display text-2xl text-black">
										M
									</Text>
								</SkeletonItem>

								{/* Name */}
								<SkeletonItem className="mt-3 self-start">
									<Text className="font-bold text-white text-xl">
										Make It Animated
									</Text>
									<Text className="font-medium text-neutral-500 text-sm">
										@makeitanimated
									</Text>
								</SkeletonItem>

								{/* Bio */}
								<SkeletonItem className="mt-3">
									<Text className="text-neutral-400 text-sm leading-5">
										Build stunning, production-ready animations for React
										Native. Smooth and performant.
									</Text>
								</SkeletonItem>

								{/* Stats */}
								<View className="mt-4 flex-row gap-2">
									<SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
										<Text className="font-semibold text-lg text-white">
											127
										</Text>
										<Text className="text-neutral-400 text-xs">Posts</Text>
									</SkeletonItem>
									<SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
										<Text className="font-semibold text-lg text-white">
											11K
										</Text>
										<Text className="text-neutral-400 text-xs">Followers</Text>
									</SkeletonItem>
									<SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
										<Text className="font-semibold text-lg text-white">5</Text>
										<Text className="text-neutral-400 text-xs">Following</Text>
									</SkeletonItem>
								</View>

								{/* Follow button */}
								<SkeletonItem className="mt-6 items-center bg-blue-500 py-3">
									<Text className="font-bold text-base text-white">Follow</Text>
								</SkeletonItem>
							</View>
						</View>
					</SkeletonGroup>
				</Pressable>
			</SkeletonContext.Provider>
			<Animated.View
				className="absolute size-16 rounded-full border-4 border-background"
				style={{
					left: avatarLeft,
					top: avatarTop,
				}}
			/>
		</>
	);
};
