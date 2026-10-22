import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Canvas, RoundedRect } from '@shopify/react-native-skia'
import { useThemeColor } from 'heroui-native'
import { AppText } from '@/src/components/shared/app-text'
import { useDualBreathAnimation } from '@/src/features/sit-with-this/components/dual-breath/use-dual-breath-animation'
import { PHASE_LABELS, WOBBLE_AMPLITUDE, WOBBLE_DURATION_MS } from '@/src/features/sit-with-this/components/dual-breath/dual-breath.constants'
import { TIMINGS } from '@/src/features/sit-with-this/components/paced-orb'
import type { BreathPattern, PacedOrbHandle } from '@/src/features/sit-with-this/components/paced-orb'
import type { BreathPhase } from '@/src/lib/haptics'

const INHALE_EASE = Easing.bezier(0.4, 0, 0.2, 1)
const EXHALE_EASE = Easing.bezier(0.2, 0, 0.1, 1)
const WOBBLE_EASE = Easing.inOut(Easing.sin)

// Reduced motion: a single short, smooth transition to the phase's target pose —
// legible as "breathe in / out" without the prolonged scaling or hold wobble.
const REDUCED_MOTION_SNAP_MS = 400
const REDUCED_MOTION_EASE = Easing.inOut(Easing.ease)

type Props = { reducedMotion?: boolean }

export const DualBreathCanvas = forwardRef<PacedOrbHandle, Props>(
  ({ reducedMotion = false }, ref) => {
    const surfaceColor = useThemeColor('surface') as string
    const accentColor = useThemeColor('accent') as string

    const [phaseLabel, setPhaseLabel] = useState<BreathPhase | null>(null)
    const labelOpacity = useSharedValue(1)
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
    const labelTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const { progress, wobbleAmt, canvasSize, topRRect, botRRect } = useDualBreathAnimation()

    // Label position tracks the bottom shape's bounds in real time
    const labelPositionStyle = useAnimatedStyle(() => {
      const { rect } = botRRect.get()
      return {
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }
    })

    const labelContainerStyle = [labelPositionStyle, styles.labelCenter]


    const labelFadeStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.get() }))

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }

    // Fade out → swap text → fade in
    const changeLabel = (phase: BreathPhase | null) => {
      clearTimeout(labelTimerRef.current)
      labelOpacity.set(withTiming(0, { duration: 180 }))
      labelTimerRef.current = setTimeout(() => {
        setPhaseLabel(phase)
        labelOpacity.set(withTiming(1, { duration: 260 }))
      }, 200)
    }

    useEffect(() => {
      return () => {
        clearTimers()
        clearTimeout(labelTimerRef.current)
        cancelAnimation(progress)
        cancelAnimation(wobbleAmt)
        cancelAnimation(labelOpacity)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => ({
      playCycle: (
        pattern: BreathPattern,
        cycles: number,
        onPhaseTransition?: (phase: BreathPhase, durationMs: number) => void,
      ): Promise<void> =>
        new Promise<void>((resolve) => {
          clearTimers()

          const steps = TIMINGS[pattern]
          const totalMs = steps.reduce((acc, s) => acc + s.duration, 0) * cycles

          if (reducedMotion) {
            let cursorMs = 0
            for (let c = 0; c < cycles; c++) {
              for (const step of steps) {
                const { phase } = step
                const t = cursorMs
                timersRef.current.push(
                  setTimeout(() => {
                    onPhaseTransition?.(phase, step.duration)
                    changeLabel(phase)

                    // Gentle snap to the target pose — no hold wobble, no haptic
                    // (onPhaseTransition is undefined under reduced motion).
                    if (phase === 'inhale') {
                      progress.set(withTiming(1, { duration: REDUCED_MOTION_SNAP_MS, easing: REDUCED_MOTION_EASE }))
                    } else if (phase === 'exhale') {
                      progress.set(withTiming(0, { duration: REDUCED_MOTION_SNAP_MS, easing: REDUCED_MOTION_EASE }))
                    }
                  }, t),
                )
                cursorMs += step.duration
              }
            }
            timersRef.current.push(setTimeout(() => { clearTimers(); resolve() }, totalMs))
            return
          }

          let cursorMs = 0
          for (let c = 0; c < cycles; c++) {
            for (const step of steps) {
              const { phase, duration } = step
              const t = cursorMs

              timersRef.current.push(
                setTimeout(() => {
                  onPhaseTransition?.(phase, duration)
                  changeLabel(phase)

                  if (phase === 'inhale') {
                    cancelAnimation(wobbleAmt)
                    wobbleAmt.set(withTiming(0, { duration: 200 }))
                    progress.set(withTiming(1, { duration, easing: INHALE_EASE }))
                  } else if (phase === 'top') {
                    wobbleAmt.set(
                      withRepeat(
                        withTiming(WOBBLE_AMPLITUDE, { duration: WOBBLE_DURATION_MS, easing: WOBBLE_EASE }),
                        -1,
                        true,
                      ),
                    )
                  } else if (phase === 'exhale') {
                    cancelAnimation(wobbleAmt)
                    wobbleAmt.set(withTiming(0, { duration: 300 }))
                    progress.set(withTiming(0, { duration, easing: EXHALE_EASE }))
                  }
                }, t),
              )

              cursorMs += duration
            }
          }

          timersRef.current.push(setTimeout(() => { clearTimers(); resolve() }, totalMs))
        }),

      cancel: () => {
        clearTimers()
        clearTimeout(labelTimerRef.current)
        cancelAnimation(progress)
        cancelAnimation(wobbleAmt)
      },
    }))

    return (
      <View style={styles.container}>
        <Canvas style={styles.canvas} onSize={canvasSize}>
          <RoundedRect rect={topRRect} color={surfaceColor} />
          <RoundedRect rect={botRRect} color={accentColor} />
        </Canvas>

        {/* Phase label — floats inside the bottom shape, tracks it in real time */}
        <Animated.View style={labelContainerStyle}>
          <Animated.View style={labelFadeStyle}>
            {phaseLabel !== null && (
              <AppText className="text-center text-sm font-medium text-background">
                {PHASE_LABELS[phaseLabel]}
              </AppText>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    )
  },
)

DualBreathCanvas.displayName = 'DualBreathCanvas'

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  canvas: { flex: 1 },
  labelCenter: { justifyContent: 'center', alignItems: 'center' },
})
