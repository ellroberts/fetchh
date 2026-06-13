import { notFound } from 'next/navigation'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}
