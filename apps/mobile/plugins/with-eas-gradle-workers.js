// Keeps EAS Android builds inside the 16 GB medium builder.
//
// The build was OOM-killed there (cgroup oom_kill=1, memory.peak 15.9 GB)
// while compiling the C++ modules. Settings, EAS builds only (server or --local):
// - org.gradle.workers.max=1: EAS passes -Dorg.gradle.parallel=true and the
//   default is one worker per CPU, so several CMake builds ran at once.
// - kotlin.compiler.execution.strategy=in-process: compile Kotlin inside the
//   Gradle JVM instead of a second long-lived Kotlin daemon JVM.
// - org.gradle.jvmargs: the template's 2 GB heap and 512 MB metaspace ran out
//   in R8 once @expo/ui brought in Jetpack Compose (thousands of full GCs, no
//   progress). With one worker, 4 GB + 1 GB still fits the 16 GB builder.
// Plain local builds (expo run, prebuild) are left alone.
const { withGradleProperties } = require("expo/config-plugins");

const EAS_PROPERTIES = {
	"kotlin.compiler.execution.strategy": "in-process",
	"org.gradle.jvmargs": "-Xmx4096m -XX:MaxMetaspaceSize=1024m",
	"org.gradle.workers.max": "1",
};

module.exports = function withEasGradleWorkers(config) {
	// EAS's servers set EAS_BUILD=true; `eas build --local` sets EAS_BUILD=1.
	if (process.env.EAS_BUILD !== "true" && process.env.EAS_BUILD !== "1") {
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
