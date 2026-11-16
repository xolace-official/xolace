/**
 * Third-party components that take `className`. Each is wrapped once, here, at
 * module level; import them from this file instead of the package.
 *
 * `withUniwind` maps `style` to `className` and every `*Color` prop to a
 * `*ColorClassName` that takes an `accent-*` class, e.g.
 * `<Image tintColorClassName="accent-foreground" />`.
 *
 * Props that aren't style stay props: BlurView's `intensity` and `tint`, and
 * LinearGradient's `colors`, an array no class can feed.
 *
 * Never wrap React Native or Reanimated components: Uniwind already handles
 * them, and wrapping one twice breaks it. A GlassView takes its classes as a
 * resolved style instead (`GlassGroup`): through `withUniwind` it drew no glass.
 */
import { BlurView as ExpoBlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { withUniwind } from "uniwind";

/** @public The redesign's screens draw their art through it (S-PRs). */
export const Image = withUniwind(ExpoImage);
/** @public The redesign's glass chrome falls back to it below iOS 26 (S-PRs). */
export const BlurView = withUniwind(ExpoBlurView);
export const LinearGradient = withUniwind(ExpoLinearGradient);
