import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Navbar } from '@/features/navigation/Navbar'
import { apiFetch } from '@/lib/api'

const AppRoot = () => {
  // Ensure the user's profile document exists in the database
  useEffect(() => {
    apiFetch('/api/user/me').catch(() => {})
  }, [])

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
