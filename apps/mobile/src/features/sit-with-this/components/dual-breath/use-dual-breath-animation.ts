import { useDerivedValue, useSharedValue } from 'react-native-reanimated'
import { GAP, SHAPE, TOP_CORNERS, BOT_CORNERS } from '@/src/features/sit-with-this/components/dual-breath/dual-breath.constants'

function lerp(a: number, b: number, t: number): number {
  'worklet'
  return a + (b - a) * t
}

export function useDualBreathAnimation() {
  // 0 = exhale rest (tall top, small bottom)
  // 1 = inhale peak (small top, tall bottom)
  const progress = useSharedValue(0)

  // Oscillates during hold — applied to corner radii for organic "alive" quality
  const wobbleAmt = useSharedValue(0)

  // Updated by Skia's onSize as the canvas dimensions are known
  const canvasSize = useSharedValue({ width: 0, height: 0 })

  // Intermediate height values shared between the pair-centering and the RRect builds
  const topH = useDerivedValue(() => {
    const { height } = canvasSize.get()
    return lerp(SHAPE.top.rest.hRatio * height, SHAPE.top.peak.hRatio * height, progress.get())
  })

  const botH = useDerivedValue(() => {
    const { height } = canvasSize.get()
    return lerp(SHAPE.bot.rest.hRatio * height, SHAPE.bot.peak.hRatio * height, progress.get())
  })

  // Center the pair vertically — both shapes move as a unit so they stay close together
  const pairStartY = useDerivedValue(() => {
    const { height } = canvasSize.get()
    return (height - topH.get() - GAP - botH.get()) / 2
  })

  // Top shape RRect — per-corner radii give the organic stone quality
  const topRRect = useDerivedValue(() => {
    const { width } = canvasSize.get()
    const p = progress.get()
    const w = lerp(SHAPE.top.rest.wRatio * width, SHAPE.top.peak.wRatio * width, p)
    const h = topH.get()
    const x = (width - w) / 2
    const y = pairStartY.get()
    const r = lerp(SHAPE.top.rest.baseR, SHAPE.top.peak.baseR, p) + wobbleAmt.get()
    return {
      rect: { x, y, width: w, height: h },
      topLeft:     { x: r * TOP_CORNERS.topLeft.x,     y: r * TOP_CORNERS.topLeft.y },
      topRight:    { x: r * TOP_CORNERS.topRight.x,    y: r * TOP_CORNERS.topRight.y },
      bottomRight: { x: r * TOP_CORNERS.bottomRight.x, y: r * TOP_CORNERS.bottomRight.y },
      bottomLeft:  { x: r * TOP_CORNERS.bottomLeft.x,  y: r * TOP_CORNERS.bottomLeft.y },
    }
  })

  // Bottom shape RRect — anchored just below the top shape via the fixed GAP
  const botRRect = useDerivedValue(() => {
    const { width } = canvasSize.get()
    const p = progress.get()
    const w = lerp(SHAPE.bot.rest.wRatio * width, SHAPE.bot.peak.wRatio * width, p)
    const h = botH.get()
    const x = (width - w) / 2
    const y = pairStartY.get() + topH.get() + GAP
    const r = lerp(SHAPE.bot.rest.baseR, SHAPE.bot.peak.baseR, p) + wobbleAmt.get()
    return {
      rect: { x, y, width: w, height: h },
      topLeft:     { x: r * BOT_CORNERS.topLeft.x,     y: r * BOT_CORNERS.topLeft.y },
      topRight:    { x: r * BOT_CORNERS.topRight.x,    y: r * BOT_CORNERS.topRight.y },
      bottomRight: { x: r * BOT_CORNERS.bottomRight.x, y: r * BOT_CORNERS.bottomRight.y },
      bottomLeft:  { x: r * BOT_CORNERS.bottomLeft.x,  y: r * BOT_CORNERS.bottomLeft.y },
    }
  })

  return { progress, wobbleAmt, canvasSize, topRRect, botRRect }
}
