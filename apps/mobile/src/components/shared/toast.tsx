import {
	Toast,
	type ToastComponentProps,
	type ToastManager,
	type ToastRootAnimation,
} from "heroui-native";
import { AccessibilityInfo, Pressable, View } from "react-native";
import { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import {
	createToastChannel,
	type ToastOptions,
	type ToastVariant,
	toastAnnouncement,
	toastDuration,
	toastHaptic,
} from "@/components/shared/toast-model";
import { REDUCED_FADE_MS } from "@/design/springs";
import { cn } from "@/lib/cn";
import { playErrorNotice } from "@/lib/haptics";

type Presenter = { manager: ToastManager; reduced: boolean };
export const toastChannel = createToastChannel<Presenter>();

const DOT: Record<ToastVariant, string | null> = {
	danger: "bg-danger",
	default: null,
	success: "bg-success",
	warning: "bg-warning",
};

const ACTION_HIT_SLOP = 8;

const fade = (kind: typeof FadeIn | typeof FadeOut) =>
	kind.duration(REDUCED_FADE_MS).reduceMotion(ReduceMotion.Never);
const REDUCED_ANIMATION: ToastRootAnimation = {
	entering: { bottom: fade(FadeIn), top: fade(FadeIn) },
	exiting: { bottom: fade(FadeOut), top: fade(FadeOut) },
};

export function toast(message: string, opts: ToastOptions = {}) {
	toastChannel.send(({ manager, reduced }) => {
		const variant = opts.variant ?? "default";
		const animation = reduced ? REDUCED_ANIMATION : undefined;
		manager.hide("all");
		manager.show({
			component: (props) => (
				<Pill
					{...props}
					animation={animation}
					message={message}
					opts={opts}
					variant={variant}
				/>
			),
			duration: toastDuration(opts),
		});
		toastHaptic(opts, playErrorNotice)?.();
		AccessibilityInfo.announceForAccessibility(
			toastAnnouncement(message, opts)
		);
	});
}

type PillProps = ToastComponentProps & {
	message: string;
	opts: ToastOptions;
	variant: ToastVariant;
	animation: ToastRootAnimation | undefined;
};

function Pill({ message, opts, variant, animation, ...props }: PillProps) {
	const dot = DOT[variant];
	const tall = Boolean(opts.description || opts.action);
	return (
		<Toast
			{...props}
			animation={animation}
			background={null}
			className={cn(
				"mt-2 max-w-full flex-row items-center gap-2.5 self-center border-continuous bg-foreground px-4.5 py-3 shadow-none",
				tall ? "rounded-[22px]" : "rounded-full"
			)}
			placement="top"
			variant={variant}
		>
			{dot ? <View className={cn("size-2 rounded-full", dot)} /> : null}
			{/* HeroUI draws a hidden copy of every toast to measure it, so VoiceOver would find the
          words twice. They're announced when it shows; only the action stays focusable. */}
			<View
				accessibilityElementsHidden
				className="shrink gap-0.5"
				importantForAccessibility="no-hide-descendants"
			>
				<AppText color="background" variant="callout" weight="semibold">
					{message}
				</AppText>
				{opts.description ? (
					<AppText className="text-background/70" variant="footnote">
						{opts.description}
					</AppText>
				) : null}
			</View>
			{opts.action ? (
				<Pressable
					accessibilityLabel={`${opts.action.label}: ${message}`}
					accessibilityRole="button"
					className="ml-1 rounded-full bg-background/15 px-3 py-1.5 active:opacity-70"
					hitSlop={ACTION_HIT_SLOP}
					onPress={() => {
						opts.action?.onPress();
						props.hide(props.id);
					}}
				>
					<AppText color="background" variant="footnote" weight="semibold">
						{opts.action.label}
					</AppText>
				</Pressable>
			) : null}
		</Toast>
	);
}
