import { XolacerAvatar } from "@/features/connect/parts/xolacer-avatar";
import type { NextParts } from "@/features/session-end/session-end-data";
import { COPY as YOU_COPY } from "@/features/you/copy";
import { DOMAIN_ICON } from "@/features/you/steadiness/parts/domain-icon";

export const END_PARTS: NextParts = {
	listenerAvatar: (listener, size) => (
		<XolacerAvatar
			id={listener.id}
			name={listener.name}
			online={listener.present}
			photoUrl={listener.photoUrl}
			size={size}
		/>
	),
	partIcon: (domain) => DOMAIN_ICON[domain],
	partName: (domain) => YOU_COPY.steadiness.domains[domain],
};
