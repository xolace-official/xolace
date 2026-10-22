/**
 * The count screen is the last thing between eleven answers and the offer, and
 * it is the only intake step that reads the network. A stats read that is slow,
 * offline or never resolves must still leave Continue reachable (#277).
 *
 * Invoked, not rendered: there is no React Native renderer in this suite, so
 * the component is called as the plain function it is and the returned element
 * tree is walked for the button label.
 */
import { describe, expect, it, vi } from 'vitest';

const stats = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('react-native', () => ({ View: 'View' }));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'Animated.View' },
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeInUp: { duration: () => ({ delay: () => ({}) }) },
}));
vi.mock('heroui-native', () => {
  const Button = Object.assign(() => null, { Label: () => null });
  return { Button };
});
vi.mock('convex/react', () => ({ useQuery: () => stats.current }));
vi.mock('@/convex/_generated/api', () => ({ api: { intake: { campfireStats: 'stats' } } }));
vi.mock('@/src/components/shared/app-text', () => ({ AppText: 'AppText' }));
vi.mock('@/src/lib/haptics', () => ({ playSoftPress: vi.fn() }));

const { CountStep } = await import('@/src/features/intake/questionnaire/count-step');

/** Every string in the returned tree, flattened. */
function textOf(node: unknown): string[] {
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(textOf);
  if (node && typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children);
  }
  return [];
}

function render(value: unknown) {
  stats.current = value;
  return textOf(CountStep({ onDone: () => {} }));
}

describe('CountStep', () => {
  it('keeps Continue reachable while the stats read is pending', () => {
    expect(render(undefined)).toContain('Continue');
  });

  it('shows the numbers once they land', () => {
    const text = render({ campers: 1234, lighterPercent: 71 });
    expect(text).toContain((1234).toLocaleString());
    expect(text.join(' ')).toMatch(/71\s*% say lighter/);
    expect(text).toContain('Continue');
  });

  it('drops the count line entirely while pending rather than guessing at it', () => {
    expect(render(undefined).join(' ')).not.toMatch(/sat by this fire|say lighter/);
  });

  it('drops the lighter line on a thin sample', () => {
    const text = render({ campers: 1, lighterPercent: null }).join(' ');
    expect(text).toContain('person has');
    expect(text).not.toContain('say lighter');
  });
});
