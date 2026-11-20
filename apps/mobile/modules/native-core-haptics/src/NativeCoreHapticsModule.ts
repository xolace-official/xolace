import { requireNativeModule } from "expo";

import type { NativeCoreHapticsModule } from "./NativeCoreHaptics.types";

export default requireNativeModule<NativeCoreHapticsModule>(
	"NativeCoreHaptics"
);
