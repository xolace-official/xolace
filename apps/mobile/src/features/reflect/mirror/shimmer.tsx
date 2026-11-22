import { useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "@/components/shared/styled";
import { EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { fadeUpProps } from "@/design/entering";
import { useTokenColors } from "@/lib/use-token-color";
import { REWRITE_MOTION } from "../motion";

const BAND_WIDTH = 2.5;
const FROM = -1.5;
const TO = 0.75;
const IN_MS = REWRITE_MOTION.shimmerMs * 0.15;
const STOPS = [0, 0.4, 0.5, 0.6, 1] as const;
const START = { x: 0, y: 0.4 } as const;
const END = { x: 1, y: 0.6 } as const;
const STILL = (FROM + TO) / 2;

export function Shimmer({ reduced }: { reduced: boolean }) {
	const [pale, warm] = useTokenColors(["surface-secondary", "ember-wash"]);
	const [w, setW] = useState(0);
	const colors = [pale, pale, warm, pale, pale] as const;
	const sweep = loopProps({
		easing: "linear",
		from: { translateX: w * (reduced ? STILL : FROM) },
		mode: "repeat",
		periodMs: REWRITE_MOTION.shimmerMs,
		reduced,
		to: { translateX: w * TO },
	});
	return (
		<EaseView
			className="absolute -inset-x-1 -inset-y-0.5 overflow-hidden rounded-[12px] bg-surface-secondary"
			pointerEvents="none"
			{...fadeUpProps(0, IN_MS, 0, reduced)}
		>
			<View
				className="absolute inset-0"
				onLayout={(e) => setW(e.nativeEvent.layout.width)}
			/>
			{w > 0 ? (
				<EaseView
					className="absolute top-0 bottom-0 left-0"
					key={w}
					style={{ width: w * BAND_WIDTH }}
					{...sweep}
				>
					<LinearGradient
						className="flex-1"
						colors={colors}
						end={END}
						locations={STOPS}
						start={START}
					/>
				</EaseView>
			) : null}
		</EaseView>
	);
}
