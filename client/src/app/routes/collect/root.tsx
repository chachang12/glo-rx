import { Outlet } from 'react-router'
import { CollectNavbar } from '@/features/collect/navigation/CollectNavbar'

const CollectRoot = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(900px 600px at 10% -10%, rgba(255,180,90,0.10), transparent 60%),
            radial-gradient(700px 500px at 90% 0%, rgba(255,72,88,0.08), transparent 60%),
            radial-gradient(1000px 700px at 50% 110%, rgba(167,139,250,0.08), transparent 65%)
          `,
        }}
      />
      <div className="relative z-10 pt-3">
        <CollectNavbar />
        <Outlet />
      </div>
    </div>
  )
}

export default CollectRoot
