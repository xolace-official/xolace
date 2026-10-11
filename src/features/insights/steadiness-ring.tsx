// Open-bottom arc ring; the gap at the bottom holds the domain icon (#491).
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Pattern, RadialGradient, Stop } from "react-native-svg";
import { SymbolView } from "expo-symbols";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import type { Icon, Tone } from "@/src/features/insights/domains";

const SWEEP = 300; // degrees of arc; the remaining 60° is the bottom gap
const START = 90 + (360 - SWEEP) / 2; // svg angles run clockwise from +x

type Props = {
  size: number;
  stroke?: number;
  /** 0–100, or null for an unfilled ring (warming, or the free view). */
  value: number | null;
  /** Colour is state, never domain. */
  tone: Tone;
  dashed?: boolean;
  icon: Icon;
  children?: ReactNode;
};

export function SteadinessRing({ size, stroke = 7, value, tone, dashed, icon, children }: Props) {
  const color = useTokenColor(tone);
  const track = useTokenColor("border");
  const fg = useTokenColor("foreground");

  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const arc = (circ * SWEEP) / 360;
  // The icon sits in the gap; keep the inner disc clear of it.
  const iconSize = Math.round(size * 0.16);
  const iconBottom = Math.max(0, stroke / 2 - 2);
  const discR = Math.min(r - stroke * 1.4, size - iconBottom - iconSize - 4 - c);
  const rotate = `rotate(${START} ${c} ${c})`;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {!dashed && (
          <>
            <Defs>
              <RadialGradient id="disc" cx="50%" cy="42%" r="60%">
                <Stop offset="0" stopColor={color} stopOpacity={0.26} />
                <Stop offset="1" stopColor={color} stopOpacity={0.07} />
              </RadialGradient>
              <Pattern id="dots" width={9} height={9} patternUnits="userSpaceOnUse">
                <Circle cx={4.5} cy={4.5} r={0.8} fill={fg} fillOpacity={0.09} />
              </Pattern>
            </Defs>
            <Circle cx={c} cy={c} r={discR} fill="url(#disc)" stroke={color} strokeOpacity={0.18} strokeWidth={1} />
            <Circle cx={c} cy={c} r={discR} fill="url(#dots)" />
          </>
        )}
        <Circle
          cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={dashed ? `2 ${stroke + 2}` : `${arc} ${circ}`}
          transform={rotate} opacity={dashed ? 1 : 0.7}
        />
        {value !== null && (
          <Circle
            cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${(arc * value) / 100} ${circ}`} transform={rotate}
          />
        )}
      </Svg>
      {children}
      <View style={{ position: "absolute", bottom: iconBottom }}>
        <SymbolView name={icon} size={iconSize} tintColor={dashed ? track : color} />
      </View>
    </View>
  );
}
