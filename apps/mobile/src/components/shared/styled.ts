import { BlurView as ExpoBlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { withUniwind } from "uniwind";

export const Image = withUniwind(ExpoImage);
export const BlurView = withUniwind(ExpoBlurView);
export const LinearGradient = withUniwind(ExpoLinearGradient);
