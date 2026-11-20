import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import { View } from "react-native";
import { MessageSystem, type MessageSystemProps } from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { CareRow } from "@/components/shared/care-row";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { THREAD } from "../copy";
import { useThreadScreen } from "../thread-data";
import { resourceRow } from "../thread-model";
import { useConversationIdentity } from "./message-identity";

const CRISIS_RESOURCES_KIND = "crisis_resources";
const LIFEBUOY = { android: "support", ios: "lifepreserver" } as const;

export function ConversationMessageSystem(props: MessageSystemProps) {
	const { message } = props;
	const identity = useConversationIdentity();
	const { actions } = useThreadScreen();
	const danger = useTokenColor("danger-ink");

	const custom = message as unknown as { kind?: unknown; resources?: unknown };
	if (
		custom.kind !== CRISIS_RESOURCES_KIND ||
		!Array.isArray(custom.resources)
	) {
		return <MessageSystem {...props} />;
	}
	const resources = custom.resources as Resource[];
	const xolacer = identity?.role === "xolacer";

	return (
		<View className="mx-3.5 my-3 gap-2.5 rounded-card border border-danger/25 bg-danger-wash p-4">
			<View className="flex-row items-center gap-2">
				<Icon color={danger} name={LIFEBUOY} size={14} />
				<AppText color="dangerInk" variant="caption" weight="semibold">
					{THREAD.resource.fromXolace}
				</AppText>
			</View>
			<AppText variant="callout">
				{xolacer ? THREAD.resource.forXolacer : THREAD.resource.forSeeker}
			</AppText>
			{resources.map((resource) => {
				const row = resourceRow(resource);
				const key = `${resource.type}-${resource.value}`;
				return row.action && row.url ? (
					<CareRow
						action={row.action}
						key={key}
						onPress={() => actions.openResource(row.url as string, row.failure)}
						phone={row.phone}
						sub={row.sub}
						title={row.title}
					/>
				) : (
					<Card className="gap-0.5 px-4 py-3" flat key={key} radius={22}>
						<AppText variant="subhead" weight="semibold">
							{row.title}
						</AppText>
						<AppText color="muted" variant="footnote">
							{row.sub}
						</AppText>
					</Card>
				);
			})}
		</View>
	);
}
