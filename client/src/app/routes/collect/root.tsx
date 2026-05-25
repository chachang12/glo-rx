import { Outlet } from 'react-router'

const CollectRoot = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      <div className="relative z-10 pt-3">
        <Outlet />
      </div>
    </div>
  )
}

export default CollectRoot
