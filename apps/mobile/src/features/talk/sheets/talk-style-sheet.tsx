import { AppText } from "@/components/shared/app-text";
import { Segmented } from "@/components/shared/segmented";
import { tap } from "@/lib/haptics";
import { TALK_COPY } from "../copy";
import { useTalkSheets } from "../talk-sheets-data";
import { SheetChrome, SheetDone } from "./sheet-chrome";

const SEGMENTS_GAP = 18;

function Label({ children }: { children: string }) {
	return (
		<AppText
			className="mb-2 ml-1"
			color="muted"
			variant="footnote"
			weight="semibold"
		>
			{children}
		</AppText>
	);
}

/**
 * How {name} talks (handoff §2.4): a form sheet with one detent, pace and directness as the
 * platform's segmented controls, each saved the moment it changes.
 */
export function TalkStyleSheet() {
	const { state, actions } = useTalkSheets();
	const { start, style } = TALK_COPY;
	return (
		<SheetChrome sub={style.sub} title={style.title(state.name)}>
			<Label>{start.pace}</Label>
			<Segmented
				haptic={tap}
				onChange={actions.setPace}
				options={style.pace}
				style={{ marginBottom: SEGMENTS_GAP }}
				value={state.pace}
			/>
			<Label>{start.directness}</Label>
			<Segmented
				haptic={tap}
				onChange={actions.setDirectness}
				options={style.directness}
				style={{ marginBottom: SEGMENTS_GAP }}
				value={state.directness}
			/>
			<AppText
				center
				className="mx-2.5 mt-0.5 mb-4.5 text-[12.5px] leading-[17px]"
				color="subtle"
				variant="caption"
			>
				{style.note(state.name)}
			</AppText>
			<SheetDone label={style.done} />
		</SheetChrome>
	);
}
