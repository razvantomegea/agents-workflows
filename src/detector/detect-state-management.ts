import { createDependencyDetector } from './dependency-detector.js';

export const detectStateManagement = createDependencyDetector([
  { packages: ['zustand'], value: 'zustand', confidence: 0.9 },
  { packages: ['@reduxjs/toolkit', 'redux'], value: 'redux', confidence: 0.9 },
  { packages: ['jotai'], value: 'jotai', confidence: 0.9 },
  { packages: ['recoil'], value: 'recoil', confidence: 0.9 },
  { packages: ['mobx'], value: 'mobx', confidence: 0.9 },
  { packages: ['pinia'], value: 'pinia', confidence: 0.9 },
  { packages: ['@tanstack/react-query'], value: 'tanstack-query', confidence: 0.8 },
]);
