import {
	BridgeProvider,
	type BridgeScreenData,
} from "@/features/care/bridge/bridge-data";
import {
	type BridgeQuota,
	type BridgeStep,
	type DraftStatus,
	quotaHintOf,
} from "@/features/care/bridge/bridge-model";
import { BridgeScreen } from "@/features/care/bridge/bridge-screen";
import { FREE_ONE_LEFT } from "@/features/care/bridge/dev/fixtures";

const noop = () => undefined;

const ACTIONS: BridgeScreenData["actions"] = {
	back: noop,
	begin: noop,
	complete: noop,
	dismiss: noop,
	getPlus: noop,
	selectRelationship: noop,
	setAddressTerm: noop,
	setDraft: noop,
	setName: noop,
	share: noop,
	write: noop,
};

type Props = {
	step: BridgeStep;
	recipient?: Partial<BridgeScreenData["state"]["recipient"]>;
	status?: DraftStatus;
	text?: string;
	written?: string | null;
	shared?: boolean;
	quota?: BridgeQuota;
};

export function FixtureBridge({
	step,
	recipient,
	status = "idle",
	text = "",
	written = null,
	shared = false,
	quota = FREE_ONE_LEFT,
}: Props) {
	const value: BridgeScreenData = {
		actions: ACTIONS,
		state: {
			draft: { shared, status, text, written },
			quota: quotaHintOf(quota),
			recipient: {
				addressTerm: null,
				name: "",
				relationship: null,
				...recipient,
			},
			step,
		},
	};
	return (
		<BridgeProvider value={value}>
			<BridgeScreen />
		</BridgeProvider>
	);
}
