import { createDependencyDetector } from './dependency-detector.js';

export const detectUiLibrary = createDependencyDetector([
  { packages: ['tamagui', '@tamagui/core'], value: 'tamagui', confidence: 0.95 },
  { packages: ['nativewind'], value: 'nativewind', confidence: 0.9 },
  { packages: ['tailwindcss'], value: 'tailwind', confidence: 0.9 },
  { packages: ['@mui/material'], value: 'mui', confidence: 0.9 },
  { packages: ['@chakra-ui/react'], value: 'chakra', confidence: 0.9 },
  { packages: ['@mantine/core'], value: 'mantine', confidence: 0.9 },
  { packages: ['antd'], value: 'ant-design', confidence: 0.9 },
  { packages: ['@radix-ui/react-dialog', 'class-variance-authority'], value: 'shadcn', confidence: 0.75 },
]);
