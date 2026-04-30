import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import { detectDotnetFramework } from '../../src/detector/detect-dotnet-framework.js';

describe('detectDotnetFramework', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'agents-dotnet-'));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('detects aspnetcore from root-level csproj containing Microsoft.AspNetCore. reference', async () => {
    const csprojContent = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>
</Project>`;
    await writeFile(join(projectRoot, 'App.csproj'), csprojContent, 'utf-8');

    const result = await detectDotnetFramework(projectRoot);

    expect(result.value).toBe('aspnetcore');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects aspnetcore from one-level-deep csproj in a subdirectory', async () => {
    const subDir = join(projectRoot, 'src');
    await mkdir(subDir, { recursive: true });
    const csprojContent = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Mvc" />
  </ItemGroup>
</Project>`;
    await writeFile(join(subDir, 'MyApp.csproj'), csprojContent, 'utf-8');

    const result = await detectDotnetFramework(projectRoot);

    expect(result.value).toBe('aspnetcore');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('returns null when no csproj file exists', async () => {
    const result = await detectDotnetFramework(projectRoot);

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('returns null when csproj does not reference Microsoft.AspNetCore.', async () => {
    const csprojContent = `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.0" />
  </ItemGroup>
</Project>`;
    await writeFile(join(projectRoot, 'ConsoleApp.csproj'), csprojContent, 'utf-8');

    const result = await detectDotnetFramework(projectRoot);

    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
