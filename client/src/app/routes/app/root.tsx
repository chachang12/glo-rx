import { Outlet } from 'react-router'
import { Navbar } from '@/features/navigation/Navbar'

const AppRoot = () => {
  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <Navbar />
      <div className="pt-20">
        <Outlet />
      </div>
    </div>
  )
}

export default AppRoot
