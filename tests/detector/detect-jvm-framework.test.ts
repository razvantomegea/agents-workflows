import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import { detectJvmFramework } from '../../src/detector/detect-jvm-framework.js';

describe('detectJvmFramework', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-jvm-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('detects spring-boot from pom.xml containing spring-boot-starter artifactId', async () => {
    const pomContent = `<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`;
    await writeFile(join(projectRoot, 'pom.xml'), pomContent, 'utf-8');

    const result = await detectJvmFramework(projectRoot);

    expect(result.value).toBe('spring-boot');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects spring-boot from build.gradle containing org.springframework.boot plugin', async () => {
    const gradleContent = `plugins {
  id 'org.springframework.boot' version '3.2.0'
}`;
    await writeFile(join(projectRoot, 'build.gradle'), gradleContent, 'utf-8');

    const result = await detectJvmFramework(projectRoot);

    expect(result.value).toBe('spring-boot');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects spring-boot from build.gradle.kts containing org.springframework.boot plugin', async () => {
    const gradleKtsContent = `plugins {
  id("org.springframework.boot") version "3.2.0"
}`;
    await writeFile(join(projectRoot, 'build.gradle.kts'), gradleKtsContent, 'utf-8');

    const result = await detectJvmFramework(projectRoot);

    expect(result.value).toBe('spring-boot');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns null detection when no JVM build files are present', async () => {
    const result = await detectJvmFramework(projectRoot);

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('returns null when pom.xml does not contain spring-boot-starter', async () => {
    const pomContent = `<project>
  <dependencies>
    <dependency>
      <groupId>com.example</groupId>
      <artifactId>plain-java-lib</artifactId>
    </dependency>
  </dependencies>
</project>`;
    await writeFile(join(projectRoot, 'pom.xml'), pomContent, 'utf-8');

    const result = await detectJvmFramework(projectRoot);

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
