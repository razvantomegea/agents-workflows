import { join } from 'node:path';
import type { Detection } from './types.js';
import { containsAny, tryReadFile } from './text-match.js';
import { BACKEND_FRAMEWORK_CONFIDENCE } from '../constants/frameworks.js';

const SPRING_BOOT_POM_NEEDLES: readonly string[] = ['<artifactId>spring-boot-starter'];
const SPRING_BOOT_GRADLE_NEEDLES: readonly string[] = ['org.springframework.boot'];
const GRADLE_FILES: readonly string[] = ['build.gradle', 'build.gradle.kts'];

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
