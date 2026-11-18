import { describe, expect, it, vi } from "vitest";

const onWindow = vi.fn();

vi.mock("react-native", () => ({
	Appearance: {
		getColorScheme: vi.fn(() => "dark"),
		setColorScheme: onWindow,
	},
}));

const { Appearance } = await import("react-native");
const { LAUNCH_PHONE_SCHEME, releaseNativeAppearance } = await import(
	"./native-appearance"
);

describe("native appearance while the launch cover is up", () => {
	it("reads the phone's scheme at launch", () => {
		expect(LAUNCH_PHONE_SCHEME).toBe("dark");
	});

	it("never reaches the window while held, not even for a frame", () => {
		// Uniwind.setTheme("light") at bootstrap, then NavThemeProvider.
		Appearance.setColorScheme("light");
		Appearance.setColorScheme("unspecified");
		Appearance.setColorScheme("light");
		expect(onWindow).not.toHaveBeenCalled();
	});

	it("applies the last call once the cover leaves, once", () => {
		releaseNativeAppearance();
		releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledTimes(1);
		expect(onWindow).toHaveBeenCalledWith("light");
	});

	it("passes every call straight through after that", () => {
		Appearance.setColorScheme("dark");
		expect(onWindow).toHaveBeenLastCalledWith("dark");
		expect(onWindow).toHaveBeenCalledTimes(2);
	});
});
