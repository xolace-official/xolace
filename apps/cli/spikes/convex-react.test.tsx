// Spike 5: do convex/react hooks work under the @opentui/react renderer on Bun?
// Needs a throwaway Convex backend exposing `counter:get` and `counter:increment`;
// pass its URL as SPIKE_CONVEX_URL. Skipped without it.
import { afterAll, describe, expect, test } from "bun:test";
import { setTimeout as sleep } from "node:timers/promises";
import { testRender } from "@opentui/react/test-utils";
import { ConvexHttpClient } from "convex/browser";
import {
	ConvexProvider,
	ConvexReactClient,
	useMutation,
	useQuery,
} from "convex/react";
import { makeFunctionReference } from "convex/server";
import { act, type ReactNode, useEffect } from "react";

const url = process.env.SPIKE_CONVEX_URL;
const WAIT_MS = 10_000;
const POLL_MS = 25;
const TEST_TIMEOUT_MS = 3 * WAIT_MS;
const COUNT_PATTERN = /count: (\d+)/;
const counter = {
	get: makeFunctionReference<"query", Record<string, never>, number>(
		"counter:get"
	),
	increment: makeFunctionReference<"mutation", Record<string, never>, null>(
		"counter:increment"
	),
};

// OpenTUI's JSX namespace has no ElementType, so TS checks a component's return
// type against ReactNode and rejects React.FC (whose return may be a Promise).
// Runtime is fine; re-type it as a plain function component.
const Provider = ConvexProvider as (props: {
	client: ConvexReactClient;
	children?: ReactNode;
}) => ReactNode;

// The tree's useMutation, handed out so the test fires it only after it has read
// the starting count.
let incrementFromTree: (() => Promise<null>) | undefined;

function Counter() {
	const value = useQuery(counter.get);
	const increment = useMutation(counter.increment);
	useEffect(() => {
		incrementFromTree = () => increment({});
	}, [increment]);
	return (
		<text>{value === undefined ? "count: loading" : `count: ${value}`}</text>
	);
}

const readCount = (frame: string) => {
	const match = COUNT_PATTERN.exec(frame);
	return match ? Number(match[1]) : undefined;
};

type Setup = Awaited<ReturnType<typeof testRender>>;

// The test renderer's own waitForFrame counts render passes, not time, so it gives
// up before a WebSocket reply lands. testRender also turns on React's act
// environment, so the pause runs inside act() to flush what arrived meanwhile.
const waitForCount = async (
	setup: Setup,
	expected: (n: number) => boolean,
	deadline = Date.now() + WAIT_MS
): Promise<number> => {
	await act(async () => {
		await sleep(POLL_MS);
	});
	await setup.renderOnce();
	const frame = setup.captureCharFrame();
	const count = readCount(frame);
	if (count !== undefined && expected(count)) {
		return count;
	}
	if (Date.now() > deadline) {
		throw new Error(`timed out; last frame:\n${frame}`);
	}
	return waitForCount(setup, expected, deadline);
};

describe.skipIf(!url)("convex/react under OpenTUI", () => {
	const client = new ConvexReactClient(url ?? "");
	afterAll(async () => {
		await client.close();
	});

	test(
		"renders a query, re-renders on its own and on others' mutations",
		async () => {
			const setup = await testRender(
				<Provider client={client}>
					<Counter />
				</Provider>,
				{ height: 5, width: 40 }
			);

			try {
				const start = await waitForCount(setup, () => true);

				// useMutation from inside the tree; the subscription pushes the new value.
				if (!incrementFromTree) {
					throw new Error("Counter never exposed its mutation");
				}
				const fire = incrementFromTree;
				await act(async () => {
					await fire();
				});
				await waitForCount(setup, (n) => n === start + 1);

				// A write from another client still reaches this renderer.
				await new ConvexHttpClient(url ?? "").mutation(counter.increment, {});
				const last = await waitForCount(setup, (n) => n === start + 2);
				expect(last).toBe(start + 2);
			} finally {
				setup.renderer.destroy();
			}
		},
		TEST_TIMEOUT_MS
	);
});
