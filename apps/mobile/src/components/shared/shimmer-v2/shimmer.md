# Shimmer

Compound component for animated shimmer highlights — overlay mode or masked to content shapes.

## Anatomy

```tsx
<Shimmer>
  <Shimmer.Overlay>...</Shimmer.Overlay>
  <Shimmer.Mask overlay={<Shimmer.Overlay>...</Shimmer.Overlay>}>...</Shimmer.Mask>
</Shimmer>
```

| Part              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `Shimmer`         | Root container. Measures dimensions and provides context to children. |
| `Shimmer.Overlay` | Animated highlight that sweeps across the container.                  |
| `Shimmer.Mask`    | Clips the overlay to children's alpha channel via MaskedView.         |

## Usage

### Overlay mode

Shimmer slides on top of visible content.

```tsx
<Shimmer className="bg-gray-700 w-48 h-16 rounded-2xl items-center justify-center">
  <Shimmer.Overlay width="50%" duration={2500} repeatDelay={1000}>
    <View className="flex-1 flex-row">
      <View className="flex-1 bg-gray-500" />
      <View className="flex-1 bg-gray-600" />
      <View className="flex-1 bg-gray-500" />
    </View>
  </Shimmer.Overlay>
  <Text className="text-white text-lg font-bold">...</Text>
</Shimmer>
```

### Mask mode — text

Shimmer is clipped to the text shape. Children must use opaque colors (e.g. `text-black`).

```tsx
<Shimmer>
  <Shimmer.Mask
    background={<View className="flex-1 bg-red-200" />}
    overlay={
      <Shimmer.Overlay width={48} duration={1500} repeatDelay={1000} trackAngle={40}>
        <View className="w-12 h-full bg-white" />
      </Shimmer.Overlay>
    }
  >
    <Text className="text-4xl font-bold text-black">Loading...</Text>
  </Shimmer.Mask>
</Shimmer>
```

### Mask mode — skeleton

Works with any shape, not just text.

```tsx
<Shimmer className="w-4/5">
  <Shimmer.Mask
    background={<View className="flex-1 bg-neutral-600" />}
    overlay={
      <Shimmer.Overlay
        width="100%"
        trackAngle={25}
        animation={{
          type: "timing",
          config: { duration: 2500, easing: Easing.bezier(0.2, 1.3, 0.8, -0.3) },
        }}
      >
        <View
          className="flex-1"
          style={{
            experimental_backgroundImage:
              "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.5), transparent)",
          }}
        />
      </Shimmer.Overlay>
    }
  >
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="size-10 rounded-full bg-black" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-full rounded-full bg-black" />
          <View className="h-3 w-3/4 rounded-full bg-black" />
        </View>
      </View>
    </View>
  </Shimmer.Mask>
</Shimmer>
```

### Controlled progress

Drive the overlay position externally with a SharedValue (0–1). Auto-play is disabled.

```tsx
const progress = useSharedValue(0);

progress.set(withTiming(1, { duration: 2000 }));

<Shimmer>
  <Shimmer.Overlay width={64} progress={progress}>
    ...
  </Shimmer.Overlay>
</Shimmer>;
```

### Synced animations via onProgress

Mirror the internal progress to derive related animations on the UI thread.

```tsx
const shimmerProgress = useSharedValue(0);

const opacityStyle = useAnimatedStyle(() => ({
  opacity: interpolate(shimmerProgress.get(), [0, 1], [0.5, 1]),
}));

<Shimmer>
  <Shimmer.Overlay width={64} onProgress={shimmerProgress}>
    ...
  </Shimmer.Overlay>
</Shimmer>;
```

## Example

Button with a three-stripe shimmer highlight sweeping across.

```tsx
import Shimmer from "@/src/shared/components/shimmer";

<Shimmer className="flex-row items-center justify-center gap-1 py-3.5 px-6 rounded-full overflow-hidden border-[0.5px] border-[#C7C8CE]/20">
  <Shimmer.Overlay
    width="30%"
    overlayAngle={30}
    repeatDelay={2000}
    animation={{
      type: "timing",
      config: { duration: 1750, easing: Easing.in(Easing.ease) },
    }}
  >
    <View className="flex-1 flex-row">
      <View className="w-[30%] bg-[#C7C8CE]/5" />
      <View className="w-[40%] bg-[#C7C8CE]/15" />
      <View className="w-[30%] bg-[#C7C8CE]/5" />
    </View>
  </Shimmer.Overlay>
  <Text className="text-white font-medium">Make it animated</Text>
</Shimmer>;
```

## API Reference

### Shimmer

Root container. Accepts all `ViewProps`.

| Prop       | Type        | Default | Description                                     |
| ---------- | ----------- | ------- | ----------------------------------------------- |
| `children` | `ReactNode` | —       | Content including Overlay and/or Mask children. |
| `debug`    | `boolean`   | `false` | Show colored borders and track line.            |
| `...rest`  | `ViewProps` | —       | All standard View props.                        |

### Shimmer.Overlay

Animated highlight that sweeps across the Shimmer container.

| Prop           | Type                       | Default                                         | Description                                                                       |
| -------------- | -------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `children`     | `ReactNode`                | —                                               | Content rendered inside the highlight.                                            |
| `width`        | `number \| \`${number}%\`` | —                                               | Overlay width — absolute pixels or percentage of container.                       |
| `trackAngle`   | `number`                   | `0`                                             | Track direction (degrees). 0°=right, 90°=down, 180°=left, 270°=up.                |
| `overlayAngle` | `number`                   | `0`                                             | Rotation applied to overlay content (degrees).                                    |
| `duration`     | `number`                   | `2000`                                          | Animation duration shorthand (ms). Ignored if `animation.config.duration` is set. |
| `initialDelay` | `number`                   | `500`                                           | Delay before first cycle (ms).                                                    |
| `repeatDelay`  | `number`                   | `0`                                             | Delay between repeat cycles (ms).                                                 |
| `animation`    | `ShimmerAnimationConfig`   | `{ type: "timing", config: { duration: 2000 }}` | Full animation config (timing or spring).                                         |
| `progress`     | `SharedValue<number>`      | —                                               | External progress (0–1). Disables auto-play.                                      |
| `onProgress`   | `SharedValue<number>`      | —                                               | Mirrors internal progress on the UI thread.                                       |

#### ShimmerAnimationConfig

| Prop           | Type                                   | Default | Description                                            |
| -------------- | -------------------------------------- | ------- | ------------------------------------------------------ |
| `type`         | `"timing" \| "spring"`                 | —       | Animation driver type.                                 |
| `config`       | `WithTimingConfig \| WithSpringConfig` | —       | Reanimated config passed to `withTiming`/`withSpring`. |
| `numberOfReps` | `number`                               | `-1`    | Repeat count. `-1` for infinite.                       |
| `reverse`      | `boolean`                              | `false` | Ping-pong: reverses direction each iteration.          |

### Shimmer.Mask

Clips the overlay to children's alpha channel. Children must use opaque colors.

| Prop         | Type           | Default | Description                                             |
| ------------ | -------------- | ------- | ------------------------------------------------------- |
| `children`   | `ReactElement` | —       | Mask shape. Must use opaque colors (e.g. `text-black`). |
| `overlay`    | `ReactElement` | —       | Animated overlay (typically a `Shimmer.Overlay`).       |
| `background` | `ReactNode`    | —       | Base fill behind the overlay, clipped to mask shape.    |
