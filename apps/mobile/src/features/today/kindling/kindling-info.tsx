import { useState } from "react";
import { View } from "react-native";
import { InfoButton, InfoTip } from "@/components/shared/info-tip";
import { COPY } from "../copy";

/** Room the card's header leaves on its right for the button (18 + gap). */
export const INFO_ROOM = 28;
const BUTTON_TOP = 18;
const BUTTON_RIGHT = 18;
const TIP_TOP = 44;

/** The "i" at the card's top right, and the tip it opens over the card. */
export function KindlingInfo() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<View
				className="absolute"
				style={{ right: BUTTON_RIGHT, top: BUTTON_TOP }}
			>
				<InfoButton
					label={COPY.kindling.infoLabel}
					onPress={() => setOpen((v) => !v)}
				/>
			</View>
			{open ? (
				<InfoTip
					body={COPY.kindling.info}
					onClose={() => setOpen(false)}
					title={COPY.kindling.title}
					top={TIP_TOP}
				/>
			) : null}
		</>
	);
}
