import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', 'build', '.react-router'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: [
        'app/**/*.d.ts',
        'app/routes/+types/**',
        'app/entry.*.tsx',
        'app/root.tsx',
        // Exclude UI components (shadcn/ui) - these are external
        'app/components/ui/**',
        // Exclude welcome page (template)
        'app/welcome/**',
      ],
      // Per-file thresholds for tested utilities
      thresholds: {
        'app/lib/auth.server.ts': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'app/lib/score-utils.ts': {
          statements: 75,
          branches: 75,
          functions: 80,
          lines: 75,
        },
      },
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});
