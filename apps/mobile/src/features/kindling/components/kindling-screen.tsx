import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Stack, useNavigation, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor, useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { KindlingTrail } from "@/features/kindling/components/kindling-trail";
import { TwigSheet } from "@/features/kindling/components/twig-sheet";
import {
	type Twig,
	twigBrowseHref,
	twigHref,
	twigSlug,
} from "@/features/kindling/twig-presentation";
import { useXolacerTwigHref } from "@/features/kindling/use-xolacer-twig-href";
import { trackLibrary } from "@/features/library/analytics";
import { playSoftPress, playTextureSelect } from "@/lib/haptics";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

/**
 * The active-kindling screen (docs/paths-v1.md §9.1, #333) — the Lantern
 * trail: header progress line, then one stop per twig down a winding trail
 * to Flux's fire, with the open twig floating over the bottom.
 * Only ever waits on its own query; generation runs off `completeSession`.
 */
export function KindlingScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const navigation = useNavigation();
	const posthog = usePostHog();
	const { toast } = useToast();
	const foreground = useThemeColor("foreground") as string;
	const headerOptions = {
		...useLargeHeaderOptions(),
		headerBackButtonDisplayMode: "minimal" as const,
		headerShown: true,
		title: "Your kindling",
	};

	const kindling = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});
	const skipStep = useMutation(api.paths.skipStep);
	const completeStep = useMutation(api.paths.completeStep);
	const dismiss = useMutation(api.paths.dismiss);
	const xolacerTwig = useXolacerTwigHref();
	const [confirmDismiss, setConfirmDismiss] = useState(false);
	const [openId, setOpenId] = useState<Twig["_id"]>();
	const [sheetHeight, setSheetHeight] = useState<number>();

	useEffect(() => {
		if (!kindling) {
			return;
		}
		posthog.capture("path_opened", { pathId: kindling._id });
		for (const twig of kindling.twigs) {
			const slug = twigSlug(twig);
			if (twig.kind === "read" && slug) {
				trackLibrary(posthog, "library_twig_shown", {
					slug,
					state: twig.state,
				});
			}
		}
		// Once per landing, not per re-render of the subscription.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [kindling?._id]);

	const handleBegin = async (twig: Twig) => {
		if (!kindling) {
			return;
		}
		playSoftPress();
		// Try-this happens away from the app: "I did this" is the tend (#567).
		if (twig.kind === "try") {
			try {
				await completeStep({ stepId: twig._id });
			} catch {
				toast.show({
					description: "Try again in a moment.",
					label: "Couldn't mark that",
				});
			}
			return;
		}
		if (xolacerTwig.pendingId) {
			return;
		}
		const href =
			twig.kind === "xolacer"
				? await xolacerTwig.resolve(twig, kindling.sessionId)
				: twigHref(twig, kindling.sessionId);
		// The match can land after Back/Dismiss: don't pull them somewhere they left.
		if (!navigation.isFocused()) {
			return;
		}
		if (!href) {
			toast.show({
				description: "This one is on its way.",
				label: "Not quite ready",
			});
			return;
		}
		posthog.capture("step_started", {
			actionType: twig.actionType,
			pathId: kindling._id,
		});
		router.push(href);
	};

	// One-off listening (§9.6): no `step_started`, no `stepId` — the binding
	// stays as it is and only "Not for me" says the track was wrong.
	const handleBrowseMore = (twig: Twig) => {
		const href = twigBrowseHref(twig);
		if (!href) {
			return;
		}
		playSoftPress();
		// Lands the Browse hub under the topic, so back and a tab re-tap reach it.
		router.push(href, { withAnchor: true });
	};

	const handleSkip = async (twig: Twig) => {
		playSoftPress();
		try {
			await skipStep({ stepId: twig._id });
		} catch {
			toast.show({
				description: "Try again in a moment.",
				label: "Couldn't skip that",
			});
		}
	};

	const handleDismiss = async () => {
		if (!kindling) {
			return;
		}
		setConfirmDismiss(false);
		// Pop before the subscription flips to null, or the empty state flashes.
		router.back();
		try {
			await dismiss({ pathId: kindling._id });
		} catch {
			toast.show({
				description: "Try again in a moment.",
				label: "Couldn't put it out",
			});
		}
	};

	const tended = kindling
		? kindling.twigs.filter((t) => t.state === "done").length
		: 0;
	// The tapped twig, else the first one still waiting, else the first.
	const open = kindling
		? (kindling.twigs.find((t) => t._id === openId) ??
			kindling.twigs.find((t) => t.state === "pending") ??
			kindling.twigs[0])
		: undefined;

	// One ScrollView as the root for every state: UIKit collapses the large
	// title only when the screen's first native child is the scroll view, and
	// it binds once — swapping a loading View for it later leaves it unbound.
	return (
		<>
			<Stack.Screen options={headerOptions} />
			{kindling ? (
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button onPress={() => setConfirmDismiss(true)}>
						Dismiss
					</Stack.Toolbar.Button>
				</Stack.Toolbar>
			) : null}

			<ScrollView
				className="flex-1 bg-background"
				contentContainerClassName="grow"
				// Clear the floating sheet (offset 12 + 28 breathing room); 260 until it measures.
				contentContainerStyle={{
					paddingBottom:
						insets.bottom +
						(open ? (sheetHeight ? sheetHeight + 40 : 260) : 40),
				}}
				contentInsetAdjustmentBehavior="automatic"
			>
				{kindling === undefined ? (
					<View className="flex-1 items-center justify-center">
						<MorphLoader />
						<AppText className="mt-6 text-muted text-sm">
							Setting up your kindling…
						</AppText>
					</View>
				) : kindling === null ? (
					<View className="flex-1 items-center justify-center px-10">
						<SymbolView
							name={{ android: "eco", ios: "leaf", web: "eco" }}
							size={40}
							tintColor={foreground}
						/>
						<AppText className="mt-4 text-center text-[15px] text-muted">
							When a session leaves something to sit with, a little kindling
							shows up here.
						</AppText>
					</View>
				) : (
					<>
						<View className="px-5 pb-2">
							<AppText className="text-[15px] text-muted">
								A few things to try, from what your last session held.
							</AppText>
							<View className="mt-4 flex-row items-center gap-3">
								<AppText className="font-medium text-[13px] text-muted">
									{tended} of {kindling.twigs.length} tended
								</AppText>
								<View className="flex-1 flex-row gap-1.5">
									{kindling.twigs.map((t) => (
										<View
											className={`h-1.5 flex-1 rounded-full ${
												t.state === "done"
													? "bg-ember"
													: t.state === "skipped"
														? "bg-border"
														: "bg-surface-secondary"
											}`}
											key={t._id}
										/>
									))}
								</View>
							</View>
						</View>

						<KindlingTrail
							onOpen={(twig) => {
								// Only a change of stop ticks; re-tapping the open one is silent.
								if (twig._id === open?._id) {
									return;
								}
								playTextureSelect();
								setOpenId(twig._id);
							}}
							openId={open?._id}
							twigs={kindling.twigs}
						/>
					</>
				)}
			</ScrollView>

			{open ? (
				<TwigSheet
					bottom={insets.bottom + 12}
					matching={xolacerTwig.pendingId === open._id}
					onBegin={() => handleBegin(open)}
					onBrowseMore={() => handleBrowseMore(open)}
					onHeight={setSheetHeight}
					onSkip={() => handleSkip(open)}
					twig={open}
				/>
			) : null}

			<ConfirmationDialog
				confirmLabel="Dismiss"
				description="Anything you haven't tended stays untended. A new one comes with your next session."
				isOpen={confirmDismiss}
				onConfirm={handleDismiss}
				onOpenChange={setConfirmDismiss}
				title="Put this kindling out?"
			/>
		</>
	);
}
