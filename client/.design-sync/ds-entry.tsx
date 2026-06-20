// Curated design-system entry for /design-sync.
// Re-exports the real, shipped Axeous components we surface to Claude Design.
// vite.config.dslib.ts compiles this to .design-sync/dist-lib/ds-entry.js
// (ESM, React externalized, import.meta.env resolved) which the converter wraps
// into the importable IIFE bundle. This is composition only — no reimplementation.

// ── Preview-only context providers ────────────────────────────────────────────
// react-query and react-router are bundled INLINE in this lib (only react/
// react-dom are externalized), so the bundle owns its own QueryClientContext /
// RouterContext instances. Re-exporting the providers here lets preview stories
// import them from 'glo-practice-tester' and share context identity with the
// components' bundled hooks (a provider imported from node_modules is a
// different module instance and throws "No QueryClient set"). Not in
// componentSrcMap, so these never become design-system cards.
export { QueryClient, QueryClientProvider } from '@tanstack/react-query'
export { MemoryRouter } from 'react-router'

// ── Shared / brand ──────────────────────────────────────────────────────────
export { Modal } from '@/features/shared/ui/Modal'
export { Tooltip } from '@/features/shared/ui/Tooltip'
export { PageLoader } from '@/features/shared/ui/PageLoader'
export { UserAvatar } from '@/features/shared/auth/components/UserAvatar'
export { LoginForm } from '@/features/shared/auth/components/LoginForm'
export { default as AxeousLogo } from '@/components/ui/AxeousLogo'
export { Navbar } from '@/features/shared/navigation/Navbar'

// ── Learn ───────────────────────────────────────────────────────────────────
export { RoadmapTrack } from '@/features/learn/roadmap/RoadmapTrack'
export { SessionHud } from '@/features/learn/tests/components/SessionHud'
export { QuestionTimer } from '@/features/learn/tests/components/QuestionTimer'
export { AnswerSurface } from '@/features/learn/tests/components/AnswerSurface'
export { FeedbackPanel } from '@/features/learn/tests/components/FeedbackPanel'
export { SessionComplete } from '@/features/learn/tests/components/SessionComplete'
export { AiTutorPanel } from '@/features/learn/tests/components/AiTutorPanel'
export { SessionReview } from '@/features/learn/tests/components/SessionReview'
export { PracticeSession } from '@/features/learn/tests/components/PracticeSession'
export { FlashcardGenerator } from '@/features/learn/flashcards/components/FlashcardGenerator'
export { AbgDriller } from '@/features/learn/abg/components/AbgDriller'

// ── Collect ─────────────────────────────────────────────────────────────────
export { CollectNavbar } from '@/features/collect/navigation/CollectNavbar'
export { MultiView } from '@/features/collect/dashboard/MultiView'
export { TelegramRow } from '@/features/collect/telegram/components/TelegramRow'
export { AdvancedModeRow } from '@/features/collect/advanced/components/AdvancedModeRow'
export { ItemMenu } from '@/features/collect/purchases/components/ItemMenu'
export { WatchFeed } from '@/features/collect/watches/components/WatchFeed'
export { ResultCard } from '@/features/collect/ebay/components/ResultCard'
export { FilterPanel } from '@/features/collect/ebay/components/FilterPanel'
export { AspectSelect } from '@/features/collect/ebay/components/AspectSelect'
