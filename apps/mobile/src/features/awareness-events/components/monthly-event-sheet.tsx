import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { BottomSheetFooter, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";
import {
	BottomSheet,
	PressableFeedback,
	Skeleton,
	useThemeColor,
} from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { posthog } from "@/config/posthog";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/store";

const CTA_ROUTE_ALLOWLIST = ["/(protected)/crisis-resources"] as const;

type Props = {
	event: Doc<"monthlyEvents"> | null;
};

export const MonthlyEventSheet = ({ event }: Props) => {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { height: screenHeight } = useWindowDimensions();
	const addToSeenEventIds = useAppStore((s) => s.addToSeenEventIds);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);

	const [imageLoading, setImageLoading] = useState(true);
	const [imageFailed, setImageFailed] = useState(false);

	const accentColor = useThemeColor("accent") as string;

	const isOpen = event !== null;
	const showImage = !!event?.imageUrl && !imageFailed;
	const hasCta = !!(event?.ctaLabel && event?.ctaRoute);
	const hasLink = !!event?.linkUrl?.startsWith("https://");

	// Footer overlays the scroll content (gorhom footers are not part of the
	// measured content height), so we pad the scroll content by its height.
	const [footerHeight, setFooterHeight] = useState(hasCta ? 132 : 76);

	// Reset image state when a new event arrives. Adjusting during render (with a
	// prev-slug comparison) instead of in an effect avoids an extra render that
	// would briefly show the previous event's image state.
	const [prevSlug, setPrevSlug] = useState<string | null>(null);
	if (event?.imageUrl && event.slug !== prevSlug) {
		setPrevSlug(event.slug);
		setImageLoading(true);
		setImageFailed(false);
	}

	const capturedSlug = useRef<string | null>(null);
	useEffect(() => {
		if (event && capturedSlug.current !== event.slug) {
			capturedSlug.current = event.slug;
			posthog.capture("awareness_event_shown", { slug: event.slug });
		}
	}, [event]);

	const markSeen = (e: Doc<"monthlyEvents">) => {
		if (e.sessionPrompt) {
			setPendingEventPrompt({
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
				label: e.title,
				text: e.sessionPrompt,
			});
		}
		addToSeenEventIds(e.slug);
	};

	const handleDismiss = () => {
		if (!event) {
			return;
		}
		markSeen(event);
		posthog.capture("awareness_event_dismissed", { slug: event.slug });
	};

	const handleLink = () => {
		if (!event?.linkUrl) {
			return;
		}
		posthog.capture("awareness_event_link_tapped", { slug: event.slug });
		markSeen(event);
		WebBrowser.openBrowserAsync(event.linkUrl);
	};

	const handleCta = () => {
		if (!event) {
			return;
		}
		markSeen(event);
		posthog.capture("awareness_event_cta_tapped", { slug: event.slug });
		const route = event.ctaRoute;
		if (route && (CTA_ROUTE_ALLOWLIST as readonly string[]).includes(route)) {
			router.push(route as (typeof CTA_ROUTE_ALLOWLIST)[number]);
		}
	};

	const renderFooter = (props: BottomSheetFooterProps) => (
		<BottomSheetFooter {...props}>
			<View
				className="gap-1 rounded-b-4xl bg-overlay px-5 pt-3 pb-5"
				onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
			>
				{hasCta && (
					<PressableFeedback
						accessibilityLabel={event!.ctaLabel}
						accessibilityRole="button"
						className="h-13 items-center justify-center rounded-2xl bg-accent"
						onPress={handleCta}
					>
						<AppText className="font-[Poppins-Medium] text-base text-white">
							{event!.ctaLabel}
						</AppText>
					</PressableFeedback>
				)}

				<PressableFeedback
					accessibilityLabel="Dismiss awareness event"
					accessibilityRole="button"
					className="items-center justify-center py-3"
					onPress={handleDismiss}
				>
					<AppText
						className={cn(
							"text-center font-[Poppins-Medium] text-[13px]",
							hasCta ? "text-foreground/55" : "text-foreground/70"
						)}
					>
						{hasCta ? "Not right now" : "I see this"}
					</AppText>
				</PressableFeedback>
			</View>
		</BottomSheetFooter>
	);

	return (
		<BottomSheet
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					handleDismiss();
				}
			}}
		>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					accessible={false}
					backgroundClassName="rounded-[32px] bg-overlay overflow-hidden"
					bottomInset={insets.bottom + 12}
					className="mx-4"
					contentContainerClassName="p-0"
					detached={true}
					enableOverDrag={false}
					enablePanDownToClose={false}
					footerComponent={renderFooter}
					handleIndicatorClassName="opacity-0"
				>
					{/* Pinned header: title stays visible while long content scrolls.
              The external-link button opens the full article when linkUrl is set. */}
					<View className="flex-row items-center justify-between gap-3 px-5 pb-3">
						<BottomSheet.Title
							className="flex-1 text-left font-semibold text-foreground text-xl leading-7"
							maxFontSizeMultiplier={1.2}
						>
							{event?.title}
						</BottomSheet.Title>
						{hasLink && (
							<PressableFeedback
								accessibilityLabel="Read the full article"
								accessibilityRole="link"
								className="size-9 items-center justify-center rounded-full bg-accent/15"
								hitSlop={8}
								onPress={handleLink}
							>
								<SymbolView
									name={{
										android: "open_in_new",
										ios: "arrow.up.right",
										web: "open_in_new",
									}}
									size={15}
									tintColor={accentColor}
								/>
							</PressableFeedback>
						)}
					</View>
					<View className="h-px bg-foreground/10" />

					{/* Cap the scrollable itself so short content keeps a snug dynamic
              height while long content scrolls under the pinned footer. */}
					<BottomSheetScrollView
						contentContainerStyle={{ paddingBottom: footerHeight + 50 }}
						showsVerticalScrollIndicator={false}
						style={{ maxHeight: screenHeight * 0.65 }}
					>
						{/* Image slot */}
						{showImage && (
							<View className="h-45 overflow-hidden">
								{imageLoading && (
									<Skeleton className="absolute inset-x-0 top-0 h-45" />
								)}
								<Image
									accessibilityLabel={`${event!.title}, awareness event image`}
									contentFit="cover"
									onError={() => setImageFailed(true)}
									onLoadEnd={() => setImageLoading(false)}
									source={{ uri: event!.imageUrl }}
									style={styles.image}
								/>
							</View>
						)}

						{/* Content */}
						<AppText className="px-5 pt-4 text-left font-[Poppins-Regular] text-foreground/80 text-sm leading-5.5">
							{event?.body}
						</AppText>
					</BottomSheetScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
};

const styles = StyleSheet.create({
	image: { height: 180, width: "100%" },
});
