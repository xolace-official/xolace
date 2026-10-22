// Keeps EAS Android builds inside the 16 GB medium builder.
//
// The build was OOM-killed there (cgroup oom_kill=1, memory.peak 15.9 GB)
// while compiling the C++ modules. Two settings, EAS only:
// - org.gradle.workers.max=1: EAS passes -Dorg.gradle.parallel=true and the
//   default is one worker per CPU, so several CMake builds ran at once.
// - kotlin.compiler.execution.strategy=in-process: compile Kotlin inside the
//   Gradle JVM instead of a second long-lived Kotlin daemon JVM.
// Local builds are left alone.
const { withGradleProperties } = require("expo/config-plugins");

const EAS_PROPERTIES = {
	"kotlin.compiler.execution.strategy": "in-process",
	"org.gradle.workers.max": "1",
};

module.exports = function withEasGradleWorkers(config) {
	if (process.env.EAS_BUILD !== "true") {
		return config;
	}
	return withGradleProperties(config, (gradleConfig) => {
		const properties = gradleConfig.modResults.filter(
			(item) => !(item.type === "property" && item.key in EAS_PROPERTIES)
		);
		for (const [key, value] of Object.entries(EAS_PROPERTIES)) {
			properties.push({ key, type: "property", value });
		}
		gradleConfig.modResults = properties;
		return gradleConfig;
	});
};
