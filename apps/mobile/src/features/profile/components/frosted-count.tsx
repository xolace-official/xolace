import { View } from "react-native";
import { Blur, Canvas, Group, Paint, Rect, Text, matchFont } from "@shopify/react-native-skia";
import { useTokenColor } from "../hooks/use-token-color";

const W = 44;
const H = 24;

// A count badge, same footprint whether locked or unlocked. Locked rows show
// a representative value behind a static blur — readable as "a number lives
// here" without revealing it. Unlocked rows (row's real word already crossed
// the wire) show the real count in the clear.
export function FrostedCount({ value, locked = true }: { value: number; locked?: boolean }) {
  const accent = useTokenColor("accent");
  const muted = useTokenColor("muted");

  const font = matchFont({
    fontFamily: "Poppins",
    fontSize: 13,
    fontStyle: "normal",
    fontWeight: "600",
  });

  const label = String(value);
  const textWidth = font.measureText ? font.measureText(label).width : label.length * 7;
  const x = (W - textWidth) / 2;
  const y = H / 2 + 4.5;

  return (
    <View
      className="rounded-lg overflow-hidden border"
      style={{ width: W, height: H, borderColor: muted + "1F" }}
    >
      <Canvas style={{ width: W, height: H }}>
        <Rect x={0} y={0} width={W} height={H} color={accent + "12"} />
        {locked ? (
          // eslint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Skia <Group layer> requires a Paint JSX element; React Compiler stabilizes it
          <Group layer={<Paint><Blur blur={4} /></Paint>}>
            <Text x={x} y={y} text={label} font={font} color={muted + "E6"} />
          </Group>
        ) : (
          <Text x={x} y={y} text={label} font={font} color={accent + "E6"} />
        )}
      </Canvas>
    </View>
  );
}
