// TEMP config for /design-sync: emits ONE self-contained stylesheet
// (all route/component CSS in a single file, fonts inlined as data-URIs) so the
// design bundle's styles.css closure carries every class the components use.
// Not committed; safe to delete.
import { mergeConfig } from 'vite'
import base from './vite.config'

export default mergeConfig(base, {
  build: {
    cssCodeSplit: false, // all CSS into one file
    assetsInlineLimit: 100_000_000, // inline woff2/svg as data: URIs -> self-contained CSS
    outDir: 'dist-dssync',
    emptyOutDir: true,
    reportCompressedSize: false,
  },
})
