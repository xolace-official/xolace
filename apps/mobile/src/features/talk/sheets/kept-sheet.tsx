import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { TALK_COPY } from "../copy";
import { keptTimeLine } from "../talk-model";
import { useTalkSheets } from "../talk-sheets-data";
import { SheetChrome, SheetDone } from "./sheet-chrome";

function Row({ icon, text }: { icon: IconName; text: string }) {
	const accent = useTokenColor("accent");
	return (
		<View className="mb-[13px] flex-row gap-3">
			<Icon color={accent} name={icon} size={18} style={{ marginTop: 1 }} />
			<AppText className="flex-1 text-[14px] leading-[20px]" variant="footnote">
				{text}
			</AppText>
		</View>
	);
}

/**
 * What's kept (handoff §2.7): production's consent card's six rows, word for word, with
 * their icons. The clock row is production's `talkTimeLine`; the lock row is
 * `PRIVACY_LINE`, exactly.
 */
export function KeptSheet() {
	const { state } = useTalkSheets();
	const { kept } = TALK_COPY;
	return (
		<SheetChrome sub={kept.sub} title={kept.title}>
			<Row
				icon={{ android: "graphic_eq", ios: "waveform" }}
				text={kept.speak}
			/>
			<Row
				icon={{ android: "auto_awesome", ios: "sparkles" }}
				text={kept.mirror}
			/>
			<Row
				icon={{ android: "stop_circle", ios: "stop.circle" }}
				text={kept.end(state.name)}
			/>
			<Row
				icon={{ android: "local_fire_department", ios: "flame" }}
				text={kept.ai(state.name)}
			/>
			<Row
				icon={{ android: "schedule", ios: "clock" }}
				text={keptTimeLine(state.week)}
			/>
			<Row icon={{ android: "lock", ios: "lock" }} text={kept.privacy} />
			<View className="mt-[5px]">
				<SheetDone label={kept.gotIt} />
			</View>
		</SheetChrome>
	);
}
