import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { useSessionMode } from "@/context/session-mode-context";
import { ActivityVariant } from "@/features/session-end/components/activity-variant";
import { ExitVariant } from "@/features/session-end/components/exit-variant";
import { ReachFeedbackCard } from "@/features/session-end/components/reach-feedback-card";
import { SessionEndNotifNudge } from "@/features/session-end/components/session-end-notif-nudge";
import { UnlockBeat } from "@/features/session-end/components/unlock-beat";
import { useSessionEnd } from "@/features/session-end/hooks/use-session-end";
import { playSessionComplete } from "@/lib/haptics";

type PostSessionMood = "lighter" | "same" | "heavier" | "unsure";
type PathType = "solo" | "peers" | "exit";

type Props = {
	path: PathType;
	sessionId: Id<"sessions"> | null;
};

const styles = StyleSheet.create({
	insetsContainer: {
		paddingBottom: 0,
		paddingTop: 0,
	},
});

export const SessionEndScreen = ({
	path,
	sessionId: routeSessionId,
}: Props) => {
	const insets = useSafeAreaInsets();
	const {
		sessionId,
		isLoading,
		distilledText,
		contributeByDefault,
		sessionCount,
		domainUnlock,
		dismiss,
		haveMore,
	} = useSessionEnd(routeSessionId);
	const { isNight } = useSessionMode();
	const insetsStyle = [
		styles.insetsContainer,
		{ paddingBottom: insets.bottom, paddingTop: insets.top },
	];

	useEffect(() => {
		if (!isLoading) {
			playSessionComplete();
		}
	}, [isLoading]);

	if (isLoading) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={insetsStyle}
			>
				<MorphLoader />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background" style={insetsStyle}>
			{path === "exit" ? (
				<ExitVariant
					isNight={isNight}
					onHaveMore={() => haveMore()}
					sessionId={sessionId ?? undefined}
				/>
			) : (
				<ActivityVariant
					contributeByDefault={contributeByDefault}
					distilledText={distilledText}
					isNight={isNight}
					onDismiss={(contributed: boolean | null, mood?: PostSessionMood) =>
						dismiss(contributed, mood)
					}
					onHaveMore={(contributed: boolean | null, mood?: PostSessionMood) =>
						haveMore(contributed, mood)
					}
					sessionId={sessionId ?? undefined}
				/>
			)}

			{sessionId && <UnlockBeat sessionId={sessionId} unlock={domainUnlock} />}
			<SessionEndNotifNudge />
			<ReachFeedbackCard sessionCount={sessionCount} />
		</View>
	);
};
