import type { ViewInstance } from 'react-native';
import React, {
  createContext,
  PropsWithChildren,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { View, Text, Pressable, type ViewProps } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useSharedValue } from "react-native-reanimated";
import Shimmer from "../index";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "heroui-native";
import { withUniwind } from "uniwind";

const StyledLinearGradient = withUniwind(LinearGradient);

const entering = FadeIn.duration(200);
const exiting = FadeOut.duration(200);

// ------------------------------------------

type SkeletonContextValue = {
  isLoading: boolean;
};

const SkeletonContext = createContext<SkeletonContextValue>({ isLoading: false });

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
      ref={ref}
      className={cn("rounded-xl", isLoading && "bg-black", className)}
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
      <Animated.View key="content" entering={entering} exiting={exiting}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View key="skeleton" entering={entering} exiting={exiting}>
      <Shimmer>
        <Shimmer.Mask
          background={<View className="flex-1 bg-neutral-800" />}
          overlay={
            <Shimmer.Overlay
              width="100%"
              animation={{
                type: "timing",
                config: {
                  duration: 1500,
                  easing: Easing.bezier(0.2, 1.3, 0.8, -0.3),
                },
              }}
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
                  colors={["#1e40af", "#7e22ce"]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  className="flex-1"
                />
              </SkeletonItem>

              <View className="px-4 pb-5">
                {/* Avatar */}
                <SkeletonItem
                  ref={avatarRef}
                  className="-mt-8 size-16 items-center justify-center rounded-full bg-brand border-4 border-background"
                >
                  <Text className="text-2xl font-black font-display text-black">M</Text>
                </SkeletonItem>

                {/* Name */}
                <SkeletonItem className="mt-3 self-start">
                  <Text className="text-xl font-bold text-white">Make It Animated</Text>
                  <Text className="text-sm text-neutral-500 font-medium">@makeitanimated</Text>
                </SkeletonItem>

                {/* Bio */}
                <SkeletonItem className="mt-3">
                  <Text className="text-sm leading-5 text-neutral-400">
                    Build stunning, production-ready animations for React Native. Smooth and
                    performant.
                  </Text>
                </SkeletonItem>

                {/* Stats */}
                <View className="mt-4 flex-row gap-2">
                  <SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
                    <Text className="text-lg font-semibold text-white">127</Text>
                    <Text className="text-xs text-neutral-400">Posts</Text>
                  </SkeletonItem>
                  <SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
                    <Text className="text-lg font-semibold text-white">11K</Text>
                    <Text className="text-xs text-neutral-400">Followers</Text>
                  </SkeletonItem>
                  <SkeletonItem className="flex-1 items-center justify-center bg-neutral-800 py-3">
                    <Text className="text-lg font-semibold text-white">5</Text>
                    <Text className="text-xs text-neutral-400">Following</Text>
                  </SkeletonItem>
                </View>

                {/* Follow button */}
                <SkeletonItem className="mt-6 items-center bg-blue-500 py-3">
                  <Text className="text-base font-bold text-white">Follow</Text>
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
