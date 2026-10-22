import { requireNativeModule } from 'expo';

import type { NativeCoreHapticsModule } from './NativeCoreHaptics.types';

// This call loads the native module object from the JSI.
export default requireNativeModule<NativeCoreHapticsModule>('NativeCoreHaptics');
