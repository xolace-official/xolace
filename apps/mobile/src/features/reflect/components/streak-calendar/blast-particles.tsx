/**
 * Skia particle blast — adapted from the particles-button sample.
 * Differences: accepts a `color` prop (sample hardcoded white) and
 * higher particle opacity so it reads over the reveal backdrop.
 * Only mounted while the reveal overlay is up.
 */

import {
	Atlas,
	Canvas,
	Circle,
	Group,
	rect,
	useRSXformBuffer,
	useTexture,
} from "@shopify/react-native-skia";
import { forwardRef, useImperativeHandle } from "react";
import type { WithSpringConfig } from "react-native-reanimated";
import {
	cancelAnimation,
	interpolate,
	useDerivedValue,
	useSharedValue,
	withDelay,
	withSpring,
} from "react-native-reanimated";

type BlastParticlesProps = {
	/** The size of the container canvas */
	size: number;
	/** Number of particles */
	count: number;
	/** Radius of each particle */
	circleRadius: number;
	/** Particle color (theme accent) */
	color: string;
	/** How far particles travel from center */
	blastRadius?: number;
};

export type BlastParticlesRef = {
	blast: (springAnimationConfig?: WithSpringConfig, delay?: number) => void;
};

export const BlastParticles = forwardRef<
	BlastParticlesRef,
	BlastParticlesProps
>(
	(
		{
			size: containerSize,
			count,
			circleRadius,
			color,
			blastRadius: blastRadiusProp,
		},
		ref
	) => {
		const circleSize = circleRadius * 2;
		const blastRadius = blastRadiusProp ?? containerSize / 2 - circleSize;

		const origin = { x: containerSize / 2, y: containerSize / 2 };
		const progress = useSharedValue(0);
		const baseRandomness = useSharedValue(Math.random());

		const sprites = useDerivedValue(() =>
			new Array(count)
				.fill(0)
				.map((_, i) => rect(circleSize * i, 0, circleSize, circleSize))
		);

		const texture = useTexture(
			<Group>
				{new Array(count).fill(0).map((_, index) => {
					return (
						<Circle
							color={color}
							cx={circleSize * index - circleRadius}
							cy={circleRadius}
							// eslint-disable-next-line react/no-array-index-key
							key={`${index}-${count}`}
							opacity={interpolate(Math.random(), [0, 1], [0.35, 0.7])}
							r={circleRadius}
						/>
					);
				})}
			</Group>,
			{
				height: circleSize,
				width: circleSize * count,
			}
		);

		useImperativeHandle(
			ref,
			() => ({
				blast: (springAnimationConfig?: WithSpringConfig, delay?: number) => {
					cancelAnimation(progress);
					baseRandomness.set(Math.random());
					progress.set(0);
					progress.set(
						withDelay(delay ?? 0, withSpring(1, springAnimationConfig))
					);
				},
			}),
			[baseRandomness, progress]
		);

		// Seeded random so particle distribution is stable within a blast
		function seededRandom(seed: number) {
			"worklet";
			const x = Math.sin(seed + 1) * 10_000;
			return Math.sqrt((x - Math.floor(x)) * baseRandomness.get());
		}

		const progressRadius = useDerivedValue(() =>
			interpolate(progress.get(), [0, 1], [0, blastRadius])
		);

		const transforms = useRSXformBuffer(count, (val, i) => {
			"worklet";
			const initialX = origin.x + circleRadius;
			const initialY = origin.y - circleRadius;

			const progressAnimation = progressRadius.get() ** (i % 2 ? 1.02 : 1);

			const xRandom = interpolate(seededRandom(i), [0, 1], [-0.5, 0.5]);
			const randomAngle = (xRandom * Math.PI * 2) / count;

			const angle = (i / count) * Math.PI * 2 + randomAngle;
			const x = Math.cos(angle) * progressAnimation;
			const y = Math.sin(angle) * progressAnimation;

			val.set(0, 1, initialX + x, initialY + y);
		});

		const opacity = useDerivedValue(() => {
			const baseOpacity = interpolate(progress.get(), [0.8, 1], [1, 0]);
			return baseOpacity ** 2;
		});

		return (
			<Canvas style={{ height: containerSize, width: containerSize }}>
				<Atlas
					image={texture}
					opacity={opacity}
					sprites={sprites}
					transforms={transforms}
				/>
			</Canvas>
		);
	}
);

BlastParticles.displayName = "BlastParticles";
