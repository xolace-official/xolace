// Steadiness insights (#525, #526): what the Reflection Agent noticed, each
// with the date it was written (ADR 0019). Overall ones sit under the overall
// dial; with a `domain`, that domain's own ones in its detail card.
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	type DomainItem,
	type Insight,
	lastSeen,
} from "@/features/insights/domains";

const EYEBROW: Record<Insight["kind"], string> = {
	absence: "What never comes up",
	crowding: "What it's pushed out",
	relief: "Where relief came from",
	say_vs_after: "What you say, and what comes after",
	thread: "One thread",
};

export function SteadinessInsights({
	insights,
	domain,
}: {
	insights?: Insight[];
	domain?: DomainItem["domain"];
}) {
	const mine = (insights ?? []).filter((i) =>
		domain
			? i.level === "domain" && i.domains.includes(domain)
			: i.level === "overall"
	);
	if (mine.length === 0) {
		return null;
	}
	return (
		<View className="gap-4 border-border border-t pt-4">
			{mine.map((i) => (
				<View className="gap-1" key={`${i.kind}:${i.domains.join()}`}>
					<AppText className="text-[12px] text-muted">
						{EYEBROW[i.kind]}
					</AppText>
					<AppText className="text-[15px] leading-6">{i.text}</AppText>
					<AppText className="text-[11px] text-muted">
						Noticed {lastSeen(i.writtenAt)}
					</AppText>
				</View>
			))}
		</View>
	);
}
