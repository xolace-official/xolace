// A past talk's thread under its mirror (#604), read-only, as it was: the companion
// on the left under the name it had then, the person on the right. Talk's own
// thread moved to the redesign; this keeps the timeline's look until the timeline
// screen is redone.

import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useCompanionName } from "@/lib/talk/use-companion-name";
import { cn } from "@/lib/utils";

function Line({
	role,
	text,
	name,
}: {
	role: "person" | "companion";
	text: string;
	name: string;
}) {
	const mine = role === "person";
	return (
		<View className={cn("max-w-[85%] gap-1", mine ? "self-end" : "self-start")}>
			<View
				className={cn(
					"rounded-3xl px-4 py-3",
					mine ? "bg-accent/15" : "bg-surface"
				)}
				style={{ borderCurve: "continuous" }}
			>
				{!mine && (
					<AppText className="mb-1 font-semibold text-accent text-xs">
						{name}
					</AppText>
				)}
				<AppText className="text-[16px] text-foreground leading-6">
					{text || "…"}
				</AppText>
			</View>
		</View>
	);
}

export function TalkTranscript({
	sessionId,
	name,
}: {
	sessionId: Id<"sessions">;
	name?: string;
}) {
	const current = useCompanionName();
	const lines = useQuery(api.talk.turns.thread, { sessionId });
	if (!lines?.length) {
		return null;
	}
	return (
		<View className="gap-3">
			{lines.map((l, i) => (
				<Line
					// The stored thread is append-only: a line's place is its identity.
					key={i}
					name={name ?? current}
					role={l.role}
					text={l.text}
				/>
			))}
		</View>
	);
}
