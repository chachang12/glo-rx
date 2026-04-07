import { authClient } from '@/lib/auth-client'

export const useUser = () => {
  const { data: session, isPending, error } = authClient.useSession()
  return {
    user: session?.user ?? null,
    isLoading: isPending,
    error,
  }
}
