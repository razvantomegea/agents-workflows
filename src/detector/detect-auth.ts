import { createDependencyDetector } from './dependency-detector.js';

export const detectAuth = createDependencyDetector([
  { packages: ['next-auth', '@auth/core'], value: 'nextauth', confidence: 0.95 },
  { packages: ['@clerk/nextjs', '@clerk/clerk-react', '@clerk/clerk-js'], value: 'clerk', confidence: 0.95 },
  { packages: ['@auth0/nextjs-auth0', 'auth0', '@auth0/auth0-react'], value: 'auth0', confidence: 0.9 },
  { packages: ['lucia'], value: 'lucia', confidence: 0.9 },
  { packages: ['@supabase/supabase-js'], value: 'supabase-auth', confidence: 0.8 },
  { packages: ['firebase', 'firebase-admin'], value: 'firebase-auth', confidence: 0.75 },
]);
