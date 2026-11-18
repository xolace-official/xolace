import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";

/** "You were reached": the in-app banner for a notification that arrived while the app was
 * open. Moved off the old Reflect home with the rest of the coming-back chain. */
const BANNER_INITIAL = { opacity: 0 };

export function NotificationBanner({
	content,
	onDismiss,
}: {
	content: string;
	onDismiss: () => void;
}) {
	const insets = useSafeAreaInsets();
	const [visible, setVisible] = useState(true);

	const handleDismiss = () => {
		setVisible(false);
	};

	useEffect(() => {
		const timer = setTimeout(handleDismiss, 8000);
		return () => clearTimeout(timer);
	}, []);

	const animate = { opacity: visible ? 1 : 0 };
	const transition = visible
		? {
				duration: 400,
				easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
				type: "timing" as const,
			}
		: {
				duration: 300,
				easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
				type: "timing" as const,
			};
	const bannerStyle = {
		boxShadow: "0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)",
		left: 20,
		position: "absolute" as const,
		right: 20,
		top: insets.top + 8,
		zIndex: 10,
	};

	return (
		<EaseView
			animate={animate}
			className={"rounded-2xl"}
			initialAnimate={BANNER_INITIAL}
			onTransitionEnd={({ finished }) => {
				if (finished && !visible) {
					onDismiss();
				}
			}}
			style={bannerStyle}
			transition={transition}
		>
			<Pressable
				className="rounded-2xl border border-border/40 bg-surface px-4 py-3"
				onPress={handleDismiss}
			>
				<AppText className="mb-0.5 text-[11px] text-foreground/40 uppercase tracking-wide">
					You were reached
				</AppText>
				<AppText className="text-foreground/85 text-sm leading-5">
					{content}
				</AppText>
				<AppText className="mt-1.5 text-[10px] text-foreground/30">
					tap to dismiss
				</AppText>
			</Pressable>
		</EaseView>
	);
}
