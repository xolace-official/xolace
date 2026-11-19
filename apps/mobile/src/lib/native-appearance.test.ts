import { describe, expect, it, vi } from "vitest";

/** React Native's own setter: what reaches the window. */
const onWindow = vi.hoisted(() => vi.fn());

vi.mock("react-native", () => ({
	Appearance: {
		getColorScheme: vi.fn(() => "dark"),
		setColorScheme: onWindow,
	},
}));

// Like Uniwind 1.13: Default's adaptive names force native appearance, every other name resets
// it, through whatever `Appearance.setColorScheme` is at the time of the call.
vi.mock("uniwind", async () => {
	const { Appearance } = await import("react-native");
	return {
		Uniwind: {
			setTheme: vi.fn((name: string) =>
				Appearance.setColorScheme(
					name === "light" || name === "dark" ? name : "auto"
				)
			),
		},
	};
});

/** The module's state on the JS global, which outlives a module reload by design. */
const appGlobal = globalThis as { __xolaceNativeAppearance?: unknown };

/** A fresh launch: the module and its mocks loaded anew, nothing written yet. */
async function launch() {
	vi.resetModules();
	onWindow.mockClear();
	appGlobal.__xolaceNativeAppearance = undefined;
	// The mocked module object outlives resetModules: give it React Native's setter back.
	const { Appearance } = await import("react-native");
	Appearance.setColorScheme = onWindow;
	const { Uniwind } = await import("uniwind");
	const appearance = await import("./native-appearance");
	return { ...appearance, Uniwind };
}

describe("native appearance", () => {
	it("reads the phone's scheme at launch", async () => {
		const { LAUNCH_PHONE_SCHEME } = await launch();
		expect(LAUNCH_PHONE_SCHEME).toBe("dark");
	});

	it("holds a wish back while the cover is up, not even a frame reaches the window", async () => {
		const { applyTheme, setNativeAppearance, Uniwind } = await launch();
		applyTheme("light");
		setNativeAppearance("light");
		expect(Uniwind.setTheme).toHaveBeenCalledWith("light");
		expect(onWindow).not.toHaveBeenCalled();
	});

	it("keeps only the last of several wishes and applies it on release", async () => {
		const { applyTheme, setNativeAppearance, releaseNativeAppearance } =
			await launch();
		applyTheme("light");
		setNativeAppearance("system");
		applyTheme("ocean-dark" as never);
		setNativeAppearance("dark");
		releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledTimes(1);
		expect(onWindow).toHaveBeenCalledWith("dark");
	});

	it("applies a theme's own write when it was the last", async () => {
		const { applyTheme, releaseNativeAppearance } = await launch();
		applyTheme("light");
		releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledExactlyOnceWith("light");
	});

	it("releases once, however often it's called", async () => {
		const { setNativeAppearance, releaseNativeAppearance } = await launch();
		setNativeAppearance("light");
		releaseNativeAppearance();
		releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledExactlyOnceWith("light");
	});

	it("writes nothing on release when nothing was wished", async () => {
		const { releaseNativeAppearance } = await launch();
		releaseNativeAppearance();
		expect(onWindow).not.toHaveBeenCalled();
	});

	it("applies every wish after release at once", async () => {
		const { applyTheme, setNativeAppearance, releaseNativeAppearance } =
			await launch();
		releaseNativeAppearance();
		setNativeAppearance("light");
		expect(onWindow).toHaveBeenLastCalledWith("light");
		setNativeAppearance("system");
		expect(onWindow).toHaveBeenLastCalledWith("auto");
		applyTheme("dark");
		expect(onWindow).toHaveBeenLastCalledWith("dark");
		expect(onWindow).toHaveBeenCalledTimes(3);
	});

	it("gives React Native its own setter back on release", async () => {
		const { releaseNativeAppearance } = await launch();
		const { Appearance } = await import("react-native");
		expect(Appearance.setColorScheme).not.toBe(onWindow);
		releaseNativeAppearance();
		expect(Appearance.setColorScheme).toBe(onWindow);
	});

	it("drops Uniwind's write for a custom theme, so the app's own light or dark stands", async () => {
		const {
			applyTheme,
			setNativeAppearance,
			releaseNativeAppearance,
			Uniwind,
		} = await launch();
		// Default dark, then the night theme: NavThemeProvider's "dark" doesn't run again.
		applyTheme("dark");
		setNativeAppearance("dark");
		applyTheme("night-dark" as never);
		expect(Uniwind.setTheme).toHaveBeenLastCalledWith("night-dark");
		releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledExactlyOnceWith("dark");
		applyTheme("ocean-dark" as never);
		expect(onWindow).toHaveBeenCalledTimes(1);
		const { Appearance } = await import("react-native");
		expect(Appearance.setColorScheme).toBe(onWindow);
	});

	it("survives a fast refresh while held: still holding, React Native's setter kept", async () => {
		const { setNativeAppearance } = await launch();
		setNativeAppearance("light");
		vi.resetModules();
		const again = await import("./native-appearance");
		const { Appearance } = await import("react-native");
		expect(Appearance.setColorScheme).not.toBe(onWindow);
		again.setNativeAppearance("dark");
		again.releaseNativeAppearance();
		expect(onWindow).toHaveBeenCalledExactlyOnceWith("dark");
		expect(Appearance.setColorScheme).toBe(onWindow);
	});

	it("survives a fast refresh after release: writes still go straight through", async () => {
		const { releaseNativeAppearance } = await launch();
		releaseNativeAppearance();
		vi.resetModules();
		const again = await import("./native-appearance");
		again.setNativeAppearance("light");
		expect(onWindow).toHaveBeenCalledExactlyOnceWith("light");
	});
});
