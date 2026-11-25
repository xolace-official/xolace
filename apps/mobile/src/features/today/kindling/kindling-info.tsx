import { useState } from "react";
import { View } from "react-native";
import { InfoButton, InfoTip } from "@/components/shared/info-tip";
import { COPY } from "../copy";

/** Room the card's header leaves on its right for the button (18 + gap). */
export const INFO_ROOM = 28;
const BUTTON_TOP = 18;
const BUTTON_RIGHT = 18;
const TIP_TOP = 44;
const TIP_BOTTOM = 12;

/**
 * The "i" at the card's top right, and the tip it opens over the card.
 * The card clips its content, so `onRoom` reports the height the card needs
 * to show the whole tip (0 when closed); on a narrow phone with large text
 * the tip runs past the card's own height.
 */
export function KindlingInfo({ onRoom }: { onRoom: (height: number) => void }) {
	const [open, setOpen] = useState(false);
	const close = () => {
		setOpen(false);
		onRoom(0);
	};
	return (
		<>
			<View
				className="absolute"
				style={{ right: BUTTON_RIGHT, top: BUTTON_TOP }}
			>
				<InfoButton
					label={COPY.kindling.infoLabel}
					onPress={() => (open ? close() : setOpen(true))}
				/>
			</View>
			{open ? (
				<InfoTip
					body={COPY.kindling.info}
					onClose={close}
					onLayout={(e) =>
						onRoom(TIP_TOP + e.nativeEvent.layout.height + TIP_BOTTOM)
					}
					title={COPY.kindling.title}
					top={TIP_TOP}
				/>
			) : null}
		</>
	);
}
