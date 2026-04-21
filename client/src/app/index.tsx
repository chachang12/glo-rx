import { ThemeProvider } from '@/components/theme-provider'
import { AppRouter } from './router'

export const App = () => {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  )
}
