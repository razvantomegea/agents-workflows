export interface Detection<T = string> {
  value: T | null;
  confidence: number;
}

export interface DetectedStack {
  language: Detection;
  runtime: Detection;
  framework: Detection;
  uiLibrary: Detection;
  stateManagement: Detection;
  database: Detection;
  auth: Detection;
  testFramework: Detection;
  testLibrary: Detection;
  e2eFramework: Detection;
  linter: Detection;
  formatter: Detection;
  packageManager: Detection;
  monorepo: boolean;
}
