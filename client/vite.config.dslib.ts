// TEMP config for /design-sync: compiles the curated DS entry
// (.design-sync/ds-entry.tsx) into a single ESM lib at
// .design-sync/dist-lib/ds-entry.js. Vite resolves import.meta.env, @/ aliases,
// JSX and CSS; React is externalized so the converter supplies one shared React.
// The converter then wraps this ESM into the importable IIFE bundle.
import { mergeConfig } from 'vite'
import path from 'node:path'
import base from './vite.config'

export default mergeConfig(base, {
  build: {
    lib: {
      entry: path.resolve(__dirname, '.design-sync/ds-entry.tsx'),
      formats: ['es'],
      fileName: () => 'ds-entry.js',
    },
    outDir: path.resolve(__dirname, '.design-sync/dist-lib'),
    emptyOutDir: true,
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: { inlineDynamicImports: true },
    },
  },
})
