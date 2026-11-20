import { useEffect, useState } from "react";
import { useAppActive } from "@/components/shared/use-app-active";

type BatteryModule = typeof import("expo-battery");

/** expo-battery is native: an OTA onto a binary built before it has no module, so it's optional. */
function loadBattery(): BatteryModule | null {
	try {
		return require("expo-battery") as BatteryModule;
	} catch {
		return null;
	}
}
const battery = loadBattery();

function useLowPower(): boolean {
	const [low, setLow] = useState(false);
	useEffect(() => {
		if (!battery) {
			return;
		}
		let live = true;
		battery
			.isLowPowerModeEnabledAsync()
			.then((on) => live && setLow(on))
			.catch(() => undefined);
		const sub = battery.addLowPowerModeListener(({ lowPowerMode }) =>
			setLow(lowPowerMode)
		);
		return () => {
			live = false;
			sub.remove();
		};
	}, []);
	return low;
}

export function useLoopRest(): { lowPower: boolean; active: boolean } {
	return { active: useAppActive(), lowPower: useLowPower() };
}
