// Caps Gradle at one worker on EAS Android builds.
//
// EAS runs Gradle with -Dorg.gradle.parallel=true and leaves
// org.gradle.workers.max at its default (one per CPU, 4 on the medium
// builder). The CMake builds of expo-modules-core, reanimated, worklets,
// skia, op-sqlite and expo-updates then compile at the same time, each
// running ninja across every core, and the 16 GB machine kills the Gradle
// daemon ("Gradle build daemon disappeared unexpectedly"). One worker keeps
// a single module compiling at a time. Local builds are left alone.
const { withGradleProperties } = require("expo/config-plugins");

const WORKERS_KEY = "org.gradle.workers.max";
const EAS_WORKERS = "1";

module.exports = function withEasGradleWorkers(config) {
	if (process.env.EAS_BUILD !== "true") {
		return config;
	}
	return withGradleProperties(config, (gradleConfig) => {
		const properties = gradleConfig.modResults.filter(
			(item) => !(item.type === "property" && item.key === WORKERS_KEY)
		);
		properties.push({ key: WORKERS_KEY, type: "property", value: EAS_WORKERS });
		gradleConfig.modResults = properties;
		return gradleConfig;
	});
};
