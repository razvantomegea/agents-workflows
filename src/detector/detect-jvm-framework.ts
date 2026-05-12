import { join } from 'node:path';
import type { Detection } from './types.js';
import { containsAny, tryReadFile } from './text-match.js';
import { BACKEND_FRAMEWORK_CONFIDENCE } from '../constants/frameworks.js';

const SPRING_BOOT_POM_NEEDLES: readonly string[] = ['<artifactId>spring-boot-starter'];
const SPRING_BOOT_GRADLE_NEEDLES: readonly string[] = ['org.springframework.boot'];
const GRADLE_FILES: readonly string[] = ['build.gradle', 'build.gradle.kts'];

/**
 * Detects whether the project uses the Spring Boot framework.
 *
 * Inspection order (first match wins):
 * 1. `pom.xml` — checks for the string `"<artifactId>spring-boot-starter"`.
 * 2. `build.gradle` then `build.gradle.kts` — checks for the string
 *    `"org.springframework.boot"`.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns A `Detection` with `value: "spring-boot"` and the confidence
 *   defined in `BACKEND_FRAMEWORK_CONFIDENCE`, or `{ value: null, confidence: 0 }`
 *   when no Spring Boot project file is found.
 * @remarks Reads up to three files (`pom.xml`, `build.gradle`,
 *   `build.gradle.kts`) via `tryReadFile`, which silently returns `null` on
 *   any read error. The function never rejects.
 */
export async function detectJvmFramework(projectRoot: string): Promise<Detection> {
  const pomContent = await tryReadFile(join(projectRoot, 'pom.xml'));
  if (pomContent !== null && containsAny(pomContent, SPRING_BOOT_POM_NEEDLES)) {
    return { value: 'spring-boot', confidence: BACKEND_FRAMEWORK_CONFIDENCE['spring-boot'] };
  }

  for (const gradleFile of GRADLE_FILES) {
    const gradleContent = await tryReadFile(join(projectRoot, gradleFile));
    if (gradleContent !== null && containsAny(gradleContent, SPRING_BOOT_GRADLE_NEEDLES)) {
      return { value: 'spring-boot', confidence: BACKEND_FRAMEWORK_CONFIDENCE['spring-boot'] };
    }
  }

  return { value: null, confidence: 0 };
}
